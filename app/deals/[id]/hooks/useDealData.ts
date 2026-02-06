'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { logger } from '@/lib/utils/logger';
import { showToast } from '@/components/ui/Toast';
import type { Deal, FinancialAnalysis } from '@/lib/types/deal';

export function useDealData(dealId: string | undefined) {
  const { workspaceId, user, session, loading: authLoading } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  // On-market AI states
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false);
  const onMarketRunningRef = useRef(false);

  // Off-market AI states
  const [runningOffMarketDD, setRunningOffMarketDD] = useState(false);
  const [offMarketError, setOffMarketError] = useState<string | null>(null);
  const offMarketRunningRef = useRef(false);

  // CIM AI states
  const [processingCim, setProcessingCim] = useState(false);
  const [cimError, setCimError] = useState<string | null>(null);
  const [cimSuccess, setCimSuccess] = useState(false);
  const cimRunningRef = useRef(false);

  // Financials AI states
  const [finLoading, setFinLoading] = useState(false);
  const [finRunning, setFinRunning] = useState(false);
  const [finError, setFinError] = useState<string | null>(null);
  const [finAnalysis, setFinAnalysis] = useState<FinancialAnalysis | null>(null);
  const financialsRunningRef = useRef(false);

  // Save toggle
  const [savingToggle, setSavingToggle] = useState(false);
  const canToggleSave = useMemo(() => deal && typeof deal?.is_saved === 'boolean', [deal]);

  const refreshDeal = async (id: string) => {
    if (!workspaceId || !user) {
      logger.error('refreshDeal: No workspaceId or user');
      return null;
    }
    
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();
    if (error) {
      logger.error('refreshDeal error:', error);
      return null;
    }
    setDeal(data);
    return data;
  };

  const fetchLatestFinancialAnalysis = async (id: string) => {
    setFinLoading(true);
    setFinError(null);

    const { data, error } = await supabase
      .from('financial_analyses')
      .select('*')
      .eq('deal_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logger.error('Error loading financial analysis:', error);
      setFinAnalysis(null);
      setFinError('Failed to load financial analysis.');
      setFinLoading(false);
      return;
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    setFinAnalysis(row);
    setFinLoading(false);
  };

  // Load deal from Supabase
  useEffect(() => {
    if (!dealId) return;
    
    // Wait for auth to finish loading AND ensure we have workspaceId and user
    if (authLoading) {
      return;
    }

    // If auth is done loading but we don't have workspaceId or user, wait a bit more
    // This handles the race condition where authLoading becomes false before workspaceId is set
    if (!workspaceId || !user) {
      // Don't log error here - this is expected during initial load
      // Just wait for the next render when workspaceId/user are available
      return;
    }

    const loadDeal = async () => {
      setLoading(true);
      setAiError(null);
      setOffMarketError(null);
      setCimError(null);
      setCimSuccess(false);
      setFinError(null);
      setFinAnalysis(null);

      // Double-check workspaceId and user are still available (defensive check)
      if (!workspaceId || !user) {
        logger.error('loadDeal: No workspaceId or user after auth loaded');
        setDeal(null);
        setLoading(false);
        return;
      }

      // Allow viewing archived deals on detail page (but they're hidden from lists)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', dealId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error) {
        logger.error('Error loading deal:', error);
        setDeal(null);
        setLoading(false);
        return;
      }

      setDeal(data);
      setLoading(false);

      if (data?.source_type === 'financials') {
        await fetchLatestFinancialAnalysis(dealId);
      }
    };

    loadDeal();
  }, [dealId, workspaceId, user, authLoading]);

  // Save / Unsave
  const toggleSaved = async () => {
    if (!dealId || !deal) return;
    if (!canToggleSave) return;

    setSavingToggle(true);
    try {
      if (!workspaceId || !user) throw new Error('No workspaceId or user');
      
      const next = !deal.is_saved;
      const { error } = await supabase
        .from('companies')
        .update({ is_saved: next })
        .eq('id', dealId)
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      setDeal((prev: Deal | null) => (prev ? { ...prev, is_saved: next } : prev));
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      logger.error('toggleSaved error:', error);
    } finally {
      setSavingToggle(false);
    }
  };

  // On-market: Run Initial Diligence (listing-text based)
  const runOnMarketInitialDiligence = async () => {
    if (!dealId || !deal) return;

    // Request deduplication
    if (onMarketRunningRef.current) return;
    onMarketRunningRef.current = true;

    if (deal.source_type !== 'on_market') {
      setAiError('Initial diligence (on-market) can only run for on-market deals.');
      onMarketRunningRef.current = false;
      return;
    }

    if (!deal.raw_listing_text) {
      setAiError('This deal has no listing text stored yet.');
      onMarketRunningRef.current = false;
      return;
    }

    setAnalyzing(true);
    setAiError(null);

    try {
      // Get fresh session token for API call
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/analyze-deal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listingText: deal.raw_listing_text,
          companyName: deal.company_name,
          city: deal.location_city,
          state: deal.location_state,
          sourceType: deal.source_type,
          listingUrl: deal.listing_url,
        }),
      });

      const text = await res.text();
      let json: {
        ai_summary?: string;
        ai_red_flags?: string;
        financials?: unknown;
        scoring?: unknown;
        criteria_match?: unknown;
        ai_confidence_json?: unknown;
        error?: string;
      } | null = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok || !json?.ai_summary) {
        logger.error('analyze status:', res.status);
        logger.error('analyze raw:', text);
        throw new Error(json?.error || `Failed to run on-market diligence (HTTP ${res.status})`);
      }

      const { ai_summary, ai_red_flags, financials, scoring, criteria_match, ai_confidence_json } = json;

      if (!workspaceId || !user) throw new Error('No workspaceId or user');

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          ai_summary,
          ai_red_flags,
          ai_financials_json: financials,
          ai_scoring_json: scoring,
          criteria_match_json: criteria_match,
          ...(ai_confidence_json ? { ai_confidence_json } : {}),
        })
        .eq('id', dealId)
        .eq('workspace_id', workspaceId);

      if (updateError) throw new Error('Failed to save AI result: ' + updateError.message);

      await refreshDeal(dealId);
      // Track AI analysis run
      window.dispatchEvent(new CustomEvent('onboarding:ai-analysis-run'));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      logger.error('runOnMarketInitialDiligence error', error);
      setAiError(error.message || 'Something went wrong running AI.');
    } finally {
      setAnalyzing(false);
      onMarketRunningRef.current = false;
    }
  };

  // Auto-run ONLY for on-market deals (only once)
  useEffect(() => {
    if (deal && deal.source_type === 'on_market' && !deal.ai_summary && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      runOnMarketInitialDiligence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal]);

  // Off-market: Run Initial Diligence (WEBSITE-BASED)
  const runOffMarketInitialDiligence = async () => {
    if (!dealId || !deal) return;

    // Request deduplication
    if (offMarketRunningRef.current) return;
    offMarketRunningRef.current = true;

    if (deal.source_type !== 'off_market') {
      setOffMarketError('Initial diligence (off-market) can only run for off-market companies.');
      offMarketRunningRef.current = false;
      return;
    }

    setRunningOffMarketDD(true);
    setOffMarketError(null);

    try {
      // Get fresh session token for API call
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const website = deal.website ?? null;
      if (!website) throw new Error('Missing website for this off-market company. Add a website before running diligence.');

      const res = await fetch('/api/off-market/diligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: dealId, website, force: true }),
      });

      const text = await res.text();
      let json: {
        success?: boolean;
        ai_summary?: string;
        ai_red_flags?: string[];
        financials?: unknown;
        scoring?: unknown;
        criteria_match?: unknown;
        ai_confidence_json?: unknown;
        error?: string;
      } | null = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok || !json?.success) {
        logger.error('diligence status:', res.status);
        logger.error('diligence raw:', text);
        throw new Error(json?.error || `Failed to run initial diligence (HTTP ${res.status})`);
      }

      const ai_summary = json.ai_summary ?? '';
      const ai_red_flags = json.ai_red_flags ?? [];
      const financials = json.financials ?? {};
      const scoring = json.scoring ?? {};
      const criteria_match = json.criteria_match ?? {};
      const ai_confidence_json = json.ai_confidence_json ?? null;

      if (!workspaceId || !user) throw new Error('No workspaceId or user');

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          ai_summary,
          ai_red_flags,
          ai_financials_json: financials,
          ai_scoring_json: scoring,
          criteria_match_json: criteria_match,
          ...(ai_confidence_json ? { ai_confidence_json } : {}),
        })
        .eq('id', dealId)
        .eq('workspace_id', workspaceId);

      if (updateError) throw new Error('Failed to save diligence: ' + updateError.message);

      await refreshDeal(dealId);
      // Track AI analysis run
      window.dispatchEvent(new CustomEvent('onboarding:ai-analysis-run'));
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      logger.error('runOffMarketInitialDiligence error:', error);
      setOffMarketError(error.message || 'Failed to run initial diligence.');
    } finally {
      setRunningOffMarketDD(false);
      offMarketRunningRef.current = false;
    }
  };

  // CIM: Run AI on PDF
  const runCimAnalysis = async () => {
    if (!dealId || !deal) return;

    // Request deduplication
    if (cimRunningRef.current) return;
    cimRunningRef.current = true;

    if (deal.source_type !== 'cim_pdf') {
      setCimError('CIM analysis can only run for CIM (PDF) deals.');
      cimRunningRef.current = false;
      return;
    }

    const cimStoragePath = deal.cim_storage_path as string | null | undefined;
    if (!cimStoragePath) {
      setCimError('Missing cim_storage_path on this company row. Re-upload the CIM or fix the stored path.');
      cimRunningRef.current = false;
      return;
    }

    setProcessingCim(true);
    setCimError(null);
    setCimSuccess(false);

    try {
      // Get session token from AuthContext
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/process-cim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: dealId, cimStoragePath, companyName: deal.company_name ?? null }),
      });

      const text = await res.text();
      let json: {
        success?: boolean;
        error?: string;
        analysis_time_seconds?: number;
      } | null = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok || !json?.success) {
        logger.error('process-cim status:', res.status);
        logger.error('process-cim raw:', text);
        throw new Error(json?.error || `Failed to process CIM (HTTP ${res.status}).`);
      }

      await refreshDeal(dealId);
      setCimSuccess(true);
      // Optional: show latency for demo ("60-second" story; if longer: "deeper forensic audit than 3 hours human")
      const sec = json.analysis_time_seconds;
      if (typeof sec === 'number' && sec > 0) {
        showToast(`Analysis complete in ${sec}s`, 'success', 4000);
      }
      // Track AI analysis run
      window.dispatchEvent(new CustomEvent('onboarding:ai-analysis-run'));
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      logger.error('runCimAnalysis error:', error);
      setCimError(error.message || 'Failed to process CIM.');
    } finally {
      setProcessingCim(false);
      cimRunningRef.current = false;
    }
  };

  // Financials: Run AI from Deal page (NO UPLOAD HERE)
  const runFinancialAnalysis = async () => {
    if (!dealId || !deal) return;

    // Request deduplication
    if (financialsRunningRef.current) return;
    financialsRunningRef.current = true;

    if (deal.source_type !== 'financials') {
      setFinError('Financial analysis can only run for Financials deals.');
      financialsRunningRef.current = false;
      return;
    }

    if (!deal.financials_storage_path) {
      setFinError('No financials file attached to this deal. Re-upload financials from the Dashboard.');
      financialsRunningRef.current = false;
      return;
    }

    setFinRunning(true);
    setFinError(null);

    try {
      // Get fresh session token for API call (similar to process-cim)
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/process-financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deal_id: dealId }),
      });

      const text = await res.text();
      let json: {
        ok?: boolean;
        error?: string;
      } | null = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok || !json?.ok) {
        logger.error('process-financials status:', res.status);
        logger.error('process-financials raw:', text);
        throw new Error(json?.error || `Financial analysis failed (HTTP ${res.status}).`);
      }

      await refreshDeal(dealId);
      await fetchLatestFinancialAnalysis(dealId);
      // Track AI analysis run
      window.dispatchEvent(new CustomEvent('onboarding:ai-analysis-run'));
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      logger.error('runFinancialAnalysis error:', error);
      setFinError(error.message || 'Failed to run financial analysis.');
    } finally {
      setFinRunning(false);
      financialsRunningRef.current = false;
    }
  };

  return {
    deal,
    loading,
    analyzing,
    aiError,
    runningOffMarketDD,
    offMarketError,
    processingCim,
    cimError,
    cimSuccess,
    finLoading,
    finRunning,
    finError,
    finAnalysis,
    savingToggle,
    canToggleSave,
    toggleSaved,
    runOnMarketInitialDiligence,
    runOffMarketInitialDiligence,
    runCimAnalysis,
    runFinancialAnalysis,
    refreshDeal: (id: string) => refreshDeal(id),
  };
}
