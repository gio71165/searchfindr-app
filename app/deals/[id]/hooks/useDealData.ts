'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../supabaseClient';

export function useDealData(dealId: string | undefined) {
  const [deal, setDeal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // On-market AI states
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false);

  // Off-market AI states
  const [runningOffMarketDD, setRunningOffMarketDD] = useState(false);
  const [offMarketError, setOffMarketError] = useState<string | null>(null);

  // CIM AI states
  const [processingCim, setProcessingCim] = useState(false);
  const [cimError, setCimError] = useState<string | null>(null);
  const [cimSuccess, setCimSuccess] = useState(false);

  // Financials AI states
  const [finLoading, setFinLoading] = useState(false);
  const [finRunning, setFinRunning] = useState(false);
  const [finError, setFinError] = useState<string | null>(null);
  const [finAnalysis, setFinAnalysis] = useState<any | null>(null);

  // Save toggle
  const [savingToggle, setSavingToggle] = useState(false);
  const canToggleSave = useMemo(() => deal && typeof deal?.is_saved === 'boolean', [deal]);

  const refreshDeal = async (id: string) => {
    const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
    if (error) {
      console.error('refreshDeal error:', error);
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
      console.error('Error loading financial analysis:', error);
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

    const loadDeal = async () => {
      setLoading(true);
      setAiError(null);
      setOffMarketError(null);
      setCimError(null);
      setCimSuccess(false);
      setFinError(null);
      setFinAnalysis(null);

      const { data, error } = await supabase.from('companies').select('*').eq('id', dealId).single();

      if (error) {
        console.error('Error loading deal:', error);
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
  }, [dealId]);

  // Save / Unsave
  const toggleSaved = async () => {
    if (!dealId || !deal) return;
    if (!canToggleSave) return;

    setSavingToggle(true);
    try {
      const next = !deal.is_saved;
      const { error } = await supabase.from('companies').update({ is_saved: next }).eq('id', dealId);
      if (error) throw error;
      setDeal((prev: any) => (prev ? { ...prev, is_saved: next } : prev));
    } catch (e: any) {
      console.error('toggleSaved error:', e);
    } finally {
      setSavingToggle(false);
    }
  };

  // On-market: Run Initial Diligence (listing-text based)
  const runOnMarketInitialDiligence = async () => {
    if (!dealId || !deal) return;

    if (deal.source_type !== 'on_market') {
      setAiError('Initial diligence (on-market) can only run for on-market deals.');
      return;
    }

    if (!deal.raw_listing_text) {
      setAiError('This deal has no listing text stored yet.');
      return;
    }

    setAnalyzing(true);
    setAiError(null);

    try {
      const res = await fetch('/api/analyze-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok || !json?.ai_summary) {
        console.error('analyze status:', res.status);
        console.error('analyze raw:', text);
        throw new Error(json?.error || `Failed to run on-market diligence (HTTP ${res.status})`);
      }

      const { ai_summary, ai_red_flags, financials, scoring, criteria_match, ai_confidence_json } = json;

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
        .eq('id', dealId);

      if (updateError) throw new Error('Failed to save AI result: ' + updateError.message);

      await refreshDeal(dealId);
    } catch (err: any) {
      console.error('runOnMarketInitialDiligence error', err);
      setAiError(err?.message || 'Something went wrong running AI.');
    } finally {
      setAnalyzing(false);
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

    if (deal.source_type !== 'off_market') {
      setOffMarketError('Initial diligence (off-market) can only run for off-market companies.');
      return;
    }

    setRunningOffMarketDD(true);
    setOffMarketError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const website = deal.website ?? null;
      if (!website) throw new Error('Missing website for this off-market company. Add a website before running diligence.');

      const res = await fetch('/api/off-market/diligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: dealId, website, force: true }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok || !json?.success) {
        console.error('diligence status:', res.status);
        console.error('diligence raw:', text);
        throw new Error(json?.error || `Failed to run initial diligence (HTTP ${res.status})`);
      }

      const ai_summary = json.ai_summary ?? '';
      const ai_red_flags = json.ai_red_flags ?? [];
      const financials = json.financials ?? {};
      const scoring = json.scoring ?? {};
      const criteria_match = json.criteria_match ?? {};
      const ai_confidence_json = json.ai_confidence_json ?? null;

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
        .eq('id', dealId);

      if (updateError) throw new Error('Failed to save diligence: ' + updateError.message);

      await refreshDeal(dealId);
    } catch (e: any) {
      console.error('runOffMarketInitialDiligence error:', e);
      setOffMarketError(e?.message || 'Failed to run initial diligence.');
    } finally {
      setRunningOffMarketDD(false);
    }
  };

  // CIM: Run AI on PDF
  const runCimAnalysis = async () => {
    if (!dealId || !deal) return;

    if (deal.source_type !== 'cim_pdf') {
      setCimError('CIM analysis can only run for CIM (PDF) deals.');
      return;
    }

    const cimStoragePath = deal.cim_storage_path as string | null | undefined;
    if (!cimStoragePath) {
      setCimError('Missing cim_storage_path on this company row. Re-upload the CIM or fix the stored path.');
      return;
    }

    setProcessingCim(true);
    setCimError(null);
    setCimSuccess(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch('/api/process-cim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: dealId, cimStoragePath, companyName: deal.company_name ?? null }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok || !json?.success) {
        console.error('process-cim status:', res.status);
        console.error('process-cim raw:', text);
        throw new Error(json?.error || `Failed to process CIM (HTTP ${res.status}).`);
      }

      await refreshDeal(dealId);
      setCimSuccess(true);
    } catch (e: any) {
      console.error('runCimAnalysis error:', e);
      setCimError(e?.message || 'Failed to process CIM.');
    } finally {
      setProcessingCim(false);
    }
  };

  // Financials: Run AI from Deal page (NO UPLOAD HERE)
  const runFinancialAnalysis = async () => {
    if (!dealId || !deal) return;

    if (deal.source_type !== 'financials') {
      setFinError('Financial analysis can only run for Financials deals.');
      return;
    }

    if (!deal.financials_storage_path) {
      setFinError('No financials file attached to this deal. Re-upload financials from the Dashboard.');
      return;
    }

    setFinRunning(true);
    setFinError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch('/api/process-financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deal_id: dealId }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok || !json?.ok) {
        console.error('process-financials status:', res.status);
        console.error('process-financials raw:', text);
        throw new Error(json?.error || `Financial analysis failed (HTTP ${res.status}).`);
      }

      await refreshDeal(dealId);
      await fetchLatestFinancialAnalysis(dealId);
    } catch (e: any) {
      console.error('runFinancialAnalysis error:', e);
      setFinError(e?.message || 'Failed to run financial analysis.');
    } finally {
      setFinRunning(false);
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
  };
}
