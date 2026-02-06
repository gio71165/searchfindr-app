'use client';

import { useState, useEffect, useMemo, useRef, useCallback, type ChangeEvent, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { DealCard } from '@/components/ui/DealCard';
import { ContentHeader } from '@/components/dashboard/ContentHeader';
import { VerdictFilters } from '@/components/dashboard/VerdictFilters';
import { BulkActionsBar } from '@/components/dashboard/BulkActionsBar';
import { SavedFilters } from '@/components/dashboard/SavedFilters';
import { PipelineKanban, KanbanViewToggle } from '@/components/dashboard/PipelineKanban';
import { PipelineAnalytics } from '@/components/dashboard/PipelineAnalytics';
import { ApplyCriteriaFilter } from '@/components/dashboard/ApplyCriteriaFilter';
import { Skeleton } from '@/components/ui/Skeleton';
import { Search as SearchIcon, FileText, TrendingUp, Target, ChevronDown, XCircle, Upload, SlidersHorizontal } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { useKeyboardShortcuts, createShortcut } from '@/lib/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { showToast } from '@/components/ui/Toast';
import { logger } from '@/lib/utils/logger';
import { CimProcessingModal } from '@/components/modals/CimProcessingModal';

type SourceType = 'on_market' | 'off_market' | 'cim_pdf' | 'financials' | null;
type Stage = 'all' | 'new' | 'reviewing' | 'follow_up' | 'ioi_sent' | 'loi' | 'dd' | 'passed';
type Verdict = 'all' | 'proceed' | 'park' | 'pass';

type Company = {
  id: string;
  company_name: string | null;
  location_city: string | null;
  location_state: string | null;
  industry: string | null;
  source_type: string | null;
  score: number | null;
  final_tier: string | null;
  created_at: string | null;
  listing_url: string | null;
  is_saved: boolean | null;
  passed_at: string | null;
  pass_reason?: string | null;
  pass_notes?: string | null;
  owner_name?: string | null;
  ai_summary?: string | null;
  ai_confidence_json?: any;
  stage?: string | null;
  verdict?: string | null;
  verdict_confidence?: string | null;
  verdict_reason?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  sba_eligible?: boolean | null;
  deal_size_band?: string | null;
  updated_at?: string | null;
};

function isAllowedFinancialFile(file: File) {
  const name = (file.name || '').toLowerCase();
  const mime = file.type || '';
  const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');
  const isCsv = mime === 'text/csv' || mime === 'application/csv' || name.endsWith('.csv');
  const isXlsx =
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel' ||
    name.endsWith('.xlsx') ||
    name.endsWith('.xls');
  return isPdf || isCsv || isXlsx;
}

function stripExt(filename: string) {
  return filename.replace(/\.(pdf|csv|xlsx|xls)$/i, '');
}

function isAllowedCimFile(file: File) {
  const name = (file.name || '').toLowerCase();
  const mime = file.type || '';
  const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');
  const isDocx = 
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx');
  const isDoc = 
    mime === 'application/msword' ||
    name.endsWith('.doc');
  return isPdf || isDocx || isDoc;
}

function stripCimExt(filename: string) {
  return filename.replace(/\.(pdf|docx|doc)$/i, '');
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function DashboardPageContent() {
  const router = useRouter();
  const { user, workspaceId, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [deals, setDeals] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter states
  const [selectedSource, setSelectedSource] = useState<SourceType>(null);
  const [selectedStage, setSelectedStage] = useState<Stage>('all');
  const [selectedVerdict, setSelectedVerdict] = useState<Verdict>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Upload state
  const [cimFile, setCimFile] = useState<File | null>(null);
  const cimInputRef = useRef<HTMLInputElement | null>(null);
  const [cimUploadStatus, setCimUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');
  const [cimUploadProgress, setCimUploadProgress] = useState(0);
  const [cimProcessingStage, setCimProcessingStage] = useState<'uploading' | 'extracting' | 'analyzing' | 'generating' | 'finalizing' | 'complete' | 'error'>('uploading');
  const [cimProcessingStartTime, setCimProcessingStartTime] = useState<number | null>(null);
  const [showCimProcessingModal, setShowCimProcessingModal] = useState(false);
  const [cimProcessingError, setCimProcessingError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [finFile, setFinFile] = useState<File | null>(null);
  const finInputRef = useRef<HTMLInputElement | null>(null);
  const [finUploadStatus, setFinUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');
  const [finUploadMsg, setFinUploadMsg] = useState<string | null>(null);

  // Keyboard shortcuts state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedDealIndex, setSelectedDealIndex] = useState<number | null>(null);

  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'cards' | 'kanban'>('cards');

  // Handle URL filter params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get('filter');
    if (filter === 'new') {
      setSelectedStage('new');
      setSelectedVerdict('all');
    } else if (filter === 'reviewing') {
      setSelectedVerdict('proceed');
      setSelectedStage('all');
    } else if (filter === 'pipeline') {
      setSelectedStage('follow_up');
      setSelectedVerdict('all');
    } else if (filter === 'passed') {
      setSelectedStage('passed');
      setSelectedVerdict('all');
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!workspaceId) {
      setErrorMsg('Missing workspace. Please contact support.');
      setLoading(false);
      return;
    }
    setErrorMsg(null);
    let ok = true;
    loadDeals(workspaceId).finally(() => {
      if (ok) setLoading(false);
    });
    return () => { ok = false; };
  }, [authLoading, user, workspaceId, router]);

  // Listen for upload triggers from navigation
  useEffect(() => {
    const handleCimUpload = () => {
      handleCimButtonClick();
    };
    const handleFinancialsUpload = () => {
      handleFinancialsButtonClick();
    };

    window.addEventListener('trigger-cim-upload', handleCimUpload);
    window.addEventListener('trigger-financials-upload', handleFinancialsUpload);

    // Also check URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('upload') === 'cim') {
      handleCimButtonClick();
      // Clean up URL
      router.replace('/dashboard', { scroll: false });
    } else if (params.get('upload') === 'financials') {
      handleFinancialsButtonClick();
      // Clean up URL
      router.replace('/dashboard', { scroll: false });
    }

    return () => {
      window.removeEventListener('trigger-cim-upload', handleCimUpload);
      window.removeEventListener('trigger-financials-upload', handleFinancialsUpload);
    };
  }, [router]);

  function errMsg(e: unknown): string {
    if (!e) return 'Unknown error';
    if (typeof e === 'string') return e;
    if (e instanceof Error) return e.message;
    const o = e as { message?: string; error?: string; code?: string };
    if (o?.message) return o.message;
    if (o?.error) return o.error;
    if (o?.code) return `Error ${o.code}`;
    try { const s = JSON.stringify(e); if (s !== '{}') return s; } catch { /* ignore */ }
    return 'Unknown error';
  }

  async function loadDeals(wsId: string) {
    // Optimized: Only fetch columns needed for DealCard display
    const columns = 'id,company_name,location_city,location_state,industry,source_type,final_tier,created_at,stage,verdict,next_action_date,sba_eligible,deal_size_band,is_saved,asking_price_extracted,ebitda_ttm_extracted,next_action,archived_at';
    const columnsNoArchived = 'id,company_name,location_city,location_state,industry,source_type,final_tier,created_at,stage,verdict,next_action_date,sba_eligible,deal_size_band,is_saved,asking_price_extracted,ebitda_ttm_extracted,next_action';

    const { data, error } = await supabase
      .from('companies')
      .select(columns)
      .eq('workspace_id', wsId)
      .is('passed_at', null)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      const msg = (error as { message?: string }).message || '';
      const code = (error as { code?: string }).code || '';
      const hint = (error as { hint?: string }).hint || '';
      const useFallback = msg.includes('archived_at') || msg.includes('column') || code === '42703' || hint.includes('archived_at');

      if (useFallback) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('companies')
          .select(columnsNoArchived)
          .eq('workspace_id', wsId)
          .is('passed_at', null)
          .order('created_at', { ascending: false })
          .limit(100);

        if (fallbackError) {
          setErrorMsg(`Failed to load deals: ${errMsg(fallbackError)}`);
          return;
        }
        setDeals((fallbackData ?? []).map((d: any) => ({
          ...d,
          score: d.score ?? null,
          listing_url: d.listing_url ?? null,
          passed_at: d.passed_at ?? null,
        })) as Company[]);
        return;
      }

      setErrorMsg(`Failed to load deals: ${errMsg(error)}`);
      return;
    }

    setDeals((data ?? []).map((d: any) => ({
      ...d,
      score: d.score ?? null,
      listing_url: d.listing_url ?? null,
      passed_at: d.passed_at ?? null,
    })) as Company[]);
  }

  // State for criteria-filtered deals
  const [criteriaFilteredDeals, setCriteriaFilteredDeals] = useState<Company[] | null>(null);
  const [activeCriteria, setActiveCriteria] = useState<any>(null);

  // Apply all filters (including criteria filter)
  const filteredDeals = useMemo(() => {
    // Start with criteria-filtered deals if available, otherwise use all deals
    const baseDeals = criteriaFilteredDeals !== null ? criteriaFilteredDeals : deals;
    
    return baseDeals.filter(deal => {
      // Source filter
      if (selectedSource !== null && deal.source_type !== selectedSource) return false;
      
      // Stage filter
      if (selectedStage !== 'all') {
        if (selectedStage === 'passed') {
          if (!deal.passed_at && deal.stage !== 'passed') return false;
        } else {
          if ((deal.stage || 'new') !== selectedStage) return false;
        }
      }
      
      // Verdict filter
      if (selectedVerdict !== 'all' && deal.verdict !== selectedVerdict) return false;
      
      // Search filter
      if (searchQuery && !deal.company_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    });
  }, [deals, criteriaFilteredDeals, selectedSource, selectedStage, selectedVerdict, searchQuery]);

  const handleCriteriaFilterChange = (filtered: Company[], criteria: any) => {
    setCriteriaFilteredDeals(filtered);
    setActiveCriteria(criteria);
  };

  // Count by stage (within selected source)
  const stageCounts = useMemo(() => {
    const sourceDeals = selectedSource === null
      ? deals.filter(d => !d.passed_at)
      : deals.filter(d => !d.passed_at && d.source_type === selectedSource);
    
    return {
      all: sourceDeals.length,
      new: sourceDeals.filter(d => (d.stage || 'new') === 'new').length,
      reviewing: sourceDeals.filter(d => d.stage === 'reviewing').length,
      follow_up: sourceDeals.filter(d => d.stage === 'follow_up').length,
      ioi_sent: sourceDeals.filter(d => d.stage === 'ioi_sent').length,
      loi: sourceDeals.filter(d => d.stage === 'loi').length,
      dd: sourceDeals.filter(d => d.stage === 'dd').length,
      passed: deals.filter(d => d.passed_at !== null || d.stage === 'passed').length
    };
  }, [deals, selectedSource]);

  // Deals for Kanban: same filters as list but no stage filter (show all stages in columns)
  const dealsForKanban = useMemo(() => {
    const base = criteriaFilteredDeals !== null ? criteriaFilteredDeals : deals;
    return base.filter((deal) => {
      if (selectedSource !== null && deal.source_type !== selectedSource) return false;
      if (selectedVerdict !== 'all' && deal.verdict !== selectedVerdict) return false;
      if (searchQuery && !deal.company_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [deals, criteriaFilteredDeals, selectedSource, selectedVerdict, searchQuery]);

  // Upload handlers - memoized to prevent re-renders
  const handleCimButtonClick = useCallback(() => cimInputRef.current?.click(), []);
  const handleFinancialsButtonClick = useCallback(() => finInputRef.current?.click(), []);

  const handleCimFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!isAllowedCimFile(file)) {
      setErrorMsg('Please upload a PDF, DOCX, or DOC file for the CIM.');
      setCimFile(null);
      setCimUploadStatus('error');
      return;
    }

    if (!userId || !workspaceId) {
      setErrorMsg('User/workspace not loaded yet. Please try again.');
      return;
    }

      setErrorMsg(null);
      setCimFile(file);
      setCimUploadStatus('uploading');
      setCimUploadProgress(0);
      setCimProcessingStage('uploading');
      setCimProcessingStartTime(Date.now());
      setShowCimProcessingModal(true);

      try {
        const fileExt = (file.name.split('.').pop() || '').toLowerCase() || 'pdf';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        // Supabase Storage bucket has MIME type restrictions
        // For DOCX/DOC files, create a new File with PDF MIME type to bypass restrictions
        // The file extension is preserved, so backend can still identify the actual file type
        let fileToUpload: File = file;
        if (fileExt === 'docx' || fileExt === 'doc') {
          // Create a new File with PDF MIME type (which is allowed) but keep original extension
          fileToUpload = new File([file], fileName, { type: 'application/pdf' });
        }

        // Upload with progress tracking
        // Note: Supabase JS client doesn't support progress callbacks, so we simulate progress
        const fileSize = fileToUpload.size;
        const startTime = Date.now();
        const estimatedUploadTime = Math.max(2000, Math.min(10000, (fileSize / 1024 / 1024) * 2000)); // 2-10 seconds based on file size
        
        // Simulate realistic upload progress
        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(90, Math.round((elapsed / estimatedUploadTime) * 90));
          setCimUploadProgress(progress);
        }, 100);

        const { data: storageData, error: storageError } = await supabase.storage
          .from('cims')
          .upload(filePath, fileToUpload);
        
        clearInterval(progressInterval);
        setCimUploadProgress(100);
      if (storageError) {
        logger.error('CIM upload error:', storageError);
        setErrorMsg('Failed to upload CIM. Please try again.');
        setCimUploadStatus('error');
        return;
      }

      const cimNameWithoutExt = stripCimExt(file.name);

      const { data: insertData, error: insertError } = await supabase
        .from('companies')
        .insert({
          company_name: cimNameWithoutExt || 'CIM Deal',
          source_type: 'cim_pdf',
          cim_storage_path: storageData?.path || filePath,
          user_id: userId,
          workspace_id: workspaceId,
        })
        .select('id')
        .single();

      if (insertError || !insertData) {
        logger.error('Error inserting CIM company row:', insertError);
        setErrorMsg('CIM uploaded, but failed to create deal record.');
        setCimUploadStatus('error');
        setCimProcessingStage('error');
        setCimProcessingError('Failed to create deal record.');
        return;
      }

      const companyId = insertData.id;
      
      // Start processing modal - transition to extracting stage
      setCimProcessingStage('extracting');
      setCimProcessingError(null);
      
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      try {
        // Get session token for API call
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) {
          throw new Error('Not authenticated');
        }
        
        // Simulate stage progression with realistic timing
        // Stage 1: Extracting (2-10 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
        setCimProcessingStage('analyzing');
        
        // Stage 2: Analyzing (10-30 seconds) - this is the main AI call
        const analyzeStartTime = Date.now();
        
        // Call process-cim API
        const processRes = await fetch('/api/process-cim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            companyId,
            cimStoragePath: storageData?.path || filePath,
            companyName: cimNameWithoutExt || 'CIM Deal',
          }),
          signal: abortControllerRef.current.signal,
        });
        
        // Stage 3: Generating (after API call starts processing)
        const analyzeElapsed = Date.now() - analyzeStartTime;
        if (analyzeElapsed > 10000) {
          setCimProcessingStage('generating');
        }
        
        const processText = await processRes.text();
        let processJson: { success?: boolean; error?: string } | null = null;
        try {
          processJson = JSON.parse(processText);
        } catch {}
        
        if (!processRes.ok || !processJson?.success) {
          throw new Error(processJson?.error || `Processing failed (HTTP ${processRes.status})`);
        }
        
        // Stage 4: Finalizing
        setCimProcessingStage('finalizing');
        
        // Refresh deals list
        await loadDeals(workspaceId);
        
        // Complete
        setCimProcessingStage('complete');
        setCimUploadStatus('uploaded');
        setCimFile(null);
        
        // Auto-close modal after 3 seconds
        setTimeout(() => {
          setShowCimProcessingModal(false);
          setCimProcessingStage('uploading');
          setCimUploadStatus('idle');
          setCimProcessingStartTime(null);
        }, 3000);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User cancelled - already handled in onCancel
          return;
        }
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        logger.error('CIM processing error:', error);
        setCimProcessingStage('error');
        setCimProcessingError(error.message || 'Failed to process CIM.');
        setCimUploadStatus('error');
        setErrorMsg(error.message || 'Failed to process CIM.');
      }
    } catch (err) {
      logger.error('Unexpected CIM upload error:', err);
      setErrorMsg('Unexpected error uploading CIM.');
      setCimUploadStatus('error');
    }
  };

  const handleFinancialsFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!isAllowedFinancialFile(file)) {
      setErrorMsg('Please upload a PDF, CSV, or Excel file for Financials.');
      setFinFile(null);
      setFinUploadStatus('error');
      setFinUploadMsg('Invalid file type.');
      return;
    }

    if (!userId || !workspaceId) {
      setErrorMsg('User/workspace not loaded yet. Please try again.');
      setFinUploadStatus('error');
      setFinUploadMsg('Missing user/workspace.');
      return;
    }

    setErrorMsg(null);
    setFinUploadMsg(null);
    setFinFile(file);
    setFinUploadStatus('uploading');

    try {
      const fileExt = (file.name.split('.').pop() || '').toLowerCase() || 'pdf';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('financials')
        .upload(filePath, file);
      if (storageError) {
        logger.error('Financials upload error:', storageError);
        setErrorMsg('Failed to upload Financials. Please try again.');
        setFinUploadStatus('error');
        setFinUploadMsg(storageError.message || 'Upload failed.');
        return;
      }

      const storedPath = storageData?.path || filePath;
      const baseName = stripExt(file.name || 'Financials');
      const dealName = baseName || 'Financials';

      const { data: insertData, error: insertError } = await supabase
        .from('companies')
        .insert({
          company_name: dealName,
          source_type: 'financials',
          financials_storage_path: storedPath,
          financials_filename: file.name || null,
          financials_mime: file.type || null,
          user_id: userId,
          workspace_id: workspaceId,
        })
        .select('id')
        .single();

      if (insertError || !insertData?.id) {
        logger.error('Error inserting Financials company row:', insertError);
        setErrorMsg('Financials uploaded, but failed to create deal record.');
        setFinUploadStatus('error');
        setFinUploadMsg('Deal creation failed.');
        return;
      }

      await loadDeals(workspaceId);
      setFinUploadStatus('uploaded');
      setFinUploadMsg('Uploaded & deal created. Open the deal to run Financial Analysis.');
      setFinFile(null);
      setTimeout(() => {
        setFinUploadStatus('idle');
        setFinUploadMsg(null);
      }, 5000);
    } catch (err: any) {
      logger.error('Unexpected financials upload error:', err);
      setFinUploadStatus('error');
      setFinUploadMsg(err?.message || 'Unexpected error uploading financials.');
    }
  };

  // Bulk selection: unlimited for bulk actions; Compare only allows 2–3
  const handleToggleDealSelection = useCallback((dealId: string) => {
    setSelectedDealIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dealId)) {
        newSet.delete(dealId);
      } else {
        newSet.add(dealId);
      }
      return newSet;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedDealIds(new Set());
  }, []);

  const handleCompareSelected = useCallback(() => {
    if (selectedDealIds.size < 2) return;
    if (selectedDealIds.size > 3) {
      showToast('Compare is limited to 2–3 deals. Deselect some to compare.', 'info', 4000);
      return;
    }
    const idsArray = Array.from(selectedDealIds);
    router.push(`/deals/compare?ids=${idsArray.join(',')}`);
  }, [selectedDealIds, router]);

  const handleBulkProceed = useCallback(async () => {
    if (selectedDealIds.size === 0) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      showToast('Please sign in', 'error');
      return;
    }
    try {
      const res = await fetch('/api/deals/bulk-verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dealIds: Array.from(selectedDealIds),
          verdict_type: 'proceed',
          searcher_input_text: 'Bulk proceed',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to mark deals as proceed');
      }
      showToast(`Marked ${selectedDealIds.size} deal(s) as Proceed`, 'success');
      handleClearSelection();
      if (workspaceId) loadDeals(workspaceId);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to mark deals as proceed', 'error');
    }
  }, [selectedDealIds, workspaceId, handleClearSelection]);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      createShortcut('/', () => {
        searchInputRef.current?.focus();
      }, 'Focus search bar', ['global', 'dashboard']),
      createShortcut('?', () => {
        setShowShortcutsModal(true);
      }, 'Show keyboard shortcuts', ['global', 'dashboard']),
      createShortcut('J', () => {
        if (filteredDeals.length > 0) {
          const currentIndex = selectedDealIndex ?? -1;
          const nextIndex = currentIndex < filteredDeals.length - 1 ? currentIndex + 1 : 0;
          setSelectedDealIndex(nextIndex);
          // Scroll into view
          const element = document.getElementById(`deal-${filteredDeals[nextIndex].id}`);
          if (element) {
            // Only scroll if element is not already in viewport
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
            if (!isVisible) {
              element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }
      }, 'Next deal in list', ['dashboard']),
      createShortcut('K', () => {
        if (filteredDeals.length > 0) {
          const currentIndex = selectedDealIndex ?? filteredDeals.length;
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredDeals.length - 1;
          setSelectedDealIndex(prevIndex);
          // Scroll into view
          const element = document.getElementById(`deal-${filteredDeals[prevIndex].id}`);
          if (element) {
            // Only scroll if element is not already in viewport
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
            if (!isVisible) {
              element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }
      }, 'Previous deal in list', ['dashboard']),
      createShortcut('Enter', () => {
        if (selectedDealIndex !== null && filteredDeals[selectedDealIndex]) {
          const viewParam = selectedSource ? `?from_view=${selectedSource}` : '';
          router.push(`/deals/${filteredDeals[selectedDealIndex].id}${viewParam}`);
        }
      }, 'Open selected deal', ['dashboard']),
      createShortcut('N', () => {
        handleCimButtonClick();
        showToast('Opening CIM upload', 'info', 1500);
      }, 'Upload new CIM', ['dashboard']),
      createShortcut('P', () => {
        if (selectedDealIndex !== null && filteredDeals[selectedDealIndex]) {
          const deal = filteredDeals[selectedDealIndex];
          router.push(`/deals/${deal.id}?action=pass`);
          showToast('Opening deal to pass', 'info', 1500);
        }
      }, 'Pass selected deal', ['dashboard']),
      createShortcut('P', () => {
        if (selectedDealIds.size > 0) handleBulkProceed();
        else showToast('Select one or more deals first', 'info', 2000);
      }, 'Bulk proceed selected deals', ['dashboard'], { shift: true }),
    ],
    true
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-full bg-slate-900 p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-sm text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-900 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8" data-onboarding="dashboard-main">
        <h1 className="text-3xl font-bold text-slate-50">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-2">Track and analyze your deal pipeline</p>
      </div>

      {/* Simplified Filter Bar - Single Row */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              aria-label="Search deals"
            />
          </div>
        </div>

        {/* Quick Verdict Filters - Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedVerdict('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedVerdict === 'all'
                ? 'bg-slate-950 text-slate-50 border border-slate-700'
                : 'bg-slate-800 text-slate-400 border border-slate-800 hover:bg-slate-700 hover:text-slate-300'
            }`}
          >
            All Deals
          </button>
          <button
            onClick={() => setSelectedVerdict('proceed')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedVerdict === 'proceed'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 border border-slate-800 hover:bg-slate-700 hover:text-slate-300'
            }`}
          >
            Proceed
          </button>
          <button
            onClick={() => setSelectedVerdict('park')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedVerdict === 'park'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 border border-slate-800 hover:bg-slate-700 hover:text-slate-300'
            }`}
          >
            Park
          </button>
        </div>

        {/* Advanced Filters Dropdown */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2 bg-slate-800 border rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            showFilters || selectedStage !== 'all' || selectedSource !== null
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
              : 'border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          More Filters
          {((selectedStage !== 'all') || (selectedSource !== null)) && (
            <span className="ml-1 text-emerald-400 font-semibold">
              ({[selectedStage !== 'all' ? 1 : 0, selectedSource !== null ? 1 : 0].reduce((a, b) => a + b, 0)})
            </span>
          )}
        </button>

        {/* View mode: Cards | Kanban */}
        <KanbanViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

        {/* Upload CIM Button */}
        <button
          onClick={handleCimButtonClick}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload CIM
        </button>
      </div>

      {/* Advanced Filters Panel (Collapsible) */}
      {showFilters && (
        <div className="mb-6 p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stage filters */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Stage</label>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: 'All', value: 'all' as const },
                  { label: 'Follow-up', value: 'follow_up' as const },
                  { label: 'IOI Sent', value: 'ioi_sent' as const },
                  { label: 'LOI', value: 'loi' as const },
                  { label: 'DD', value: 'dd' as const },
                ].map((stage) => (
                  <button
                    key={stage.value}
                    onClick={() => setSelectedStage(stage.value as Stage)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedStage === stage.value
                        ? 'bg-slate-950 text-slate-50 border border-slate-700'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source filters */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Source</label>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: 'All', value: null as SourceType },
                  { label: 'CIM', value: 'cim_pdf' as const },
                  { label: 'Financials', value: 'financials' as const },
                  { label: 'On-Market', value: 'on_market' as const },
                  { label: 'Off-Market', value: 'off_market' as const },
                ].map((source) => (
                  <button
                    key={source.value ?? 'all'}
                    onClick={() => setSelectedSource(source.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedSource === source.value
                        ? 'bg-slate-950 text-slate-50 border border-slate-700'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {source.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards - Dark theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* New Deals - Emerald accent */}
        <button
          onClick={() => {
            setSelectedStage('new');
            setSelectedVerdict('all');
            router.push('/dashboard?filter=new', { scroll: false });
          }}
          className={`bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg transition-all duration-200 cursor-pointer group text-left ${
            selectedStage === 'new' ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            {stageCounts.new > 0 && (
              <span className="text-xs font-medium text-slate-400">In analysis</span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold font-mono text-slate-50">{stageCounts.new || 0}</p>
            <p className="text-sm text-slate-400">New Deals</p>
          </div>
          <div className="mt-4 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition">
            Click to filter →
          </div>
        </button>

        {/* Reviewing - Blue accent */}
        <button
          onClick={() => {
            setSelectedVerdict('proceed');
            setSelectedStage('all');
            router.push('/dashboard?filter=reviewing', { scroll: false });
          }}
          className={`bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg transition-all duration-200 cursor-pointer group text-left ${
            selectedVerdict === 'proceed' ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            {stageCounts.reviewing > 0 && (
              <span className="text-xs font-medium text-slate-400">In analysis</span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold font-mono text-slate-50">{stageCounts.reviewing || 0}</p>
            <p className="text-sm text-slate-400">Reviewing</p>
          </div>
          <div className="mt-4 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition">
            Click to filter →
          </div>
        </button>

        {/* In Pipeline - Amber accent */}
        <button
          onClick={() => {
            setSelectedStage('follow_up');
            setSelectedVerdict('all');
            router.push('/dashboard?filter=pipeline', { scroll: false });
          }}
          className={`bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg transition-all duration-200 cursor-pointer group text-left ${
            selectedStage === 'follow_up' || selectedStage === 'ioi_sent' || selectedStage === 'loi' || selectedStage === 'dd' ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            {(stageCounts.follow_up || 0) + (stageCounts.ioi_sent || 0) + (stageCounts.loi || 0) + (stageCounts.dd || 0) > 0 && (
              <span className="text-xs font-medium text-slate-400">Active deals</span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold font-mono text-slate-50">
              {(stageCounts.follow_up || 0) + (stageCounts.ioi_sent || 0) + (stageCounts.loi || 0) + (stageCounts.dd || 0)}
            </p>
            <p className="text-sm text-slate-400">In Pipeline</p>
          </div>
          <div className="mt-4 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition">
            Click to filter →
          </div>
        </button>

        {/* Passed - Slate accent */}
        <button
          onClick={() => {
            setSelectedStage('passed');
            setSelectedVerdict('all');
            router.push('/dashboard?filter=passed', { scroll: false });
          }}
          className={`bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg transition-all duration-200 cursor-pointer group text-left ${
            selectedStage === 'passed' ? 'ring-2 ring-slate-500 ring-offset-2 ring-offset-slate-900' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-slate-700/50 rounded-lg">
              <XCircle className="w-5 h-5 text-slate-400" />
            </div>
            {stageCounts.passed > 0 && (
              <span className="text-xs font-medium text-slate-400">This month</span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold font-mono text-slate-50">{stageCounts.passed || 0}</p>
            <p className="text-sm text-slate-400">Passed</p>
          </div>
          <div className="mt-4 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition">
            Click to filter →
          </div>
        </button>
      </div>

      {/* Pipeline analytics (conversion by stage) */}
      <PipelineAnalytics stageCounts={stageCounts} />

      {/* Saved Filters & Criteria Filter (keep for functionality) */}
      <div className="mb-6">
        <ApplyCriteriaFilter
          deals={deals as any}
          onFilterChange={handleCriteriaFilterChange}
        />
        
        <SavedFilters
          onLoadFilter={(filters) => {
            if (filters.source !== undefined) setSelectedSource(filters.source as SourceType);
            if (filters.stage !== undefined) setSelectedStage(filters.stage as Stage);
            if (filters.verdict !== undefined) setSelectedVerdict(filters.verdict as Verdict);
            if (filters.search !== undefined) setSearchQuery(filters.search);
          }}
          currentFilters={{
            source: selectedSource,
            stage: selectedStage,
            verdict: selectedVerdict,
            search: searchQuery,
          }}
        />
      </div>

      {/* Hidden file inputs */}
      <input ref={cimInputRef} type="file" accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" className="hidden" onChange={handleCimFileChange} />
      <input
        ref={finInputRef}
        type="file"
        accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFinancialsFileChange}
      />

      {/* Upload Status Messages (only show when not in processing modal) */}
      {cimUploadStatus !== 'idle' && !showCimProcessingModal && (
        <div
          className={`rounded-xl border-2 p-4 mb-4 ${
            cimUploadStatus === 'uploaded'
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
              : cimUploadStatus === 'error'
                ? 'bg-red-950/30 border-red-500/30 text-red-400'
                : 'bg-blue-950/30 border-blue-500/30 text-blue-400'
          }`}
        >
          <div className="font-semibold">
            {cimUploadStatus === 'uploading' && `Uploading CIM… ${Math.round(cimUploadProgress)}%`}
            {cimUploadStatus === 'uploaded' && 'CIM uploaded successfully!'}
            {cimUploadStatus === 'error' && 'CIM upload failed'}
          </div>
          {cimFile && (
            <div className="text-sm mt-1 opacity-90">
              File: {cimFile.name}
              {cimUploadStatus === 'uploading' && (
                <span className="ml-2">
                  ({formatFileSize((cimFile.size * cimUploadProgress) / 100)} / {formatFileSize(cimFile.size)})
                </span>
              )}
            </div>
          )}
          {cimUploadStatus === 'uploading' && (
            <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${cimUploadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {finUploadStatus !== 'idle' && (
        <div
          className={`rounded-xl border-2 p-4 mb-4 ${
            finUploadStatus === 'uploaded'
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
              : finUploadStatus === 'error'
                ? 'bg-red-950/30 border-red-500/30 text-red-400'
                : 'bg-blue-950/30 border-blue-500/30 text-blue-400'
          }`}
          style={{ animation: 'fadeInUp 0.3s ease-out' }}
        >
          <div className="font-semibold">
            {finUploadStatus === 'uploading' && 'Uploading Financials…'}
            {finUploadStatus === 'uploaded' && 'Financials uploaded successfully!'}
            {finUploadStatus === 'error' && 'Financials upload failed'}
          </div>
          {finUploadMsg && <div className="text-sm mt-1 opacity-90">{finUploadMsg}</div>}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedDealIds.size > 0 && (
        <>
          <BulkActionsBar
            selectedDealIds={selectedDealIds}
            onClearSelection={handleClearSelection}
            onRefresh={() => workspaceId && loadDeals(workspaceId)}
          />
          
          {/* Compare: only for 2–3 deals */}
          {selectedDealIds.size >= 2 && (
            <div className="mb-6 p-4 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-between gap-4">
              <span className="text-sm text-slate-400">
                {selectedDealIds.size <= 3
                  ? `Compare ${selectedDealIds.size} deals side-by-side`
                  : `Compare is limited to 2–3 deals. ${selectedDealIds.size} selected — use bulk actions or deselect to compare.`}
              </span>
              <button
                onClick={handleCompareSelected}
                disabled={selectedDealIds.size > 3}
                className="btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Compare Selected
              </button>
            </div>
          )}
        </>
      )}

      {/* DEAL CARDS */}
      {deals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Let's analyze your first deal"
          description="SearchFindr will extract key metrics, identify red flags, and help you decide in 60 seconds."
          actionLabel="📤 Upload Your First CIM"
          onAction={handleCimButtonClick}
          showSampleOption={true}
          onSampleAction={async () => {
            try {
              // Fetch the sample CIM from public folder
              const response = await fetch('/sample-cim.pdf');
              if (!response.ok) throw new Error('Failed to fetch sample CIM');
              const blob = await response.blob();
              const file = new File([blob], 'sample-cim.pdf', { type: 'application/pdf' });
              
              // Trigger the CIM upload handler with the sample file
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              const input = document.createElement('input');
              input.type = 'file';
              input.files = dataTransfer.files;
              
              // Simulate file selection
              if (cimInputRef.current) {
                Object.defineProperty(cimInputRef.current, 'files', {
                  value: dataTransfer.files,
                  writable: false,
                });
                const event = new Event('change', { bubbles: true });
                cimInputRef.current.dispatchEvent(event);
              }
            } catch (error) {
              console.error('Error loading sample CIM:', error);
              alert('Failed to load sample CIM. Please try uploading your own CIM.');
            }
          }}
        />
      ) : viewMode === 'kanban' ? (
        <>
          <div className="mb-6 text-sm font-medium text-slate-400">
            Kanban: <span className="font-semibold text-slate-50">{dealsForKanban.length}</span> deals
            {activeCriteria && (
              <span className="ml-2 text-blue-400">(filtered by &quot;{activeCriteria.name}&quot;)</span>
            )}
          </div>
          <PipelineKanban
            deals={dealsForKanban}
            onRefresh={() => workspaceId && loadDeals(workspaceId)}
            onToggleSelect={handleToggleDealSelection}
            selectedDealIds={selectedDealIds}
            canSelect={true}
            fromView={selectedSource || undefined}
          />
        </>
      ) : filteredDeals.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No deals match your filters"
          description="Try adjusting your filters or add a new deal to your pipeline."
          actionLabel="Clear Filters"
          onAction={() => {
            setSelectedSource(null);
            setSelectedStage('all');
            setSelectedVerdict('all');
            setSearchQuery('');
          }}
          secondaryActionLabel="Upload CIM"
          onSecondaryAction={handleCimButtonClick}
        />
      ) : (
        <>
          <div className="mb-6 text-sm font-medium text-slate-400">
            Showing <span className="font-semibold text-slate-50">{filteredDeals.length}</span> of{' '}
            <span className="font-semibold text-slate-50">{criteriaFilteredDeals !== null ? criteriaFilteredDeals.length : deals.length}</span> deals
            {activeCriteria && (
              <span className="ml-2 text-blue-400">
                (filtered by "{activeCriteria.name}")
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-5 lg:gap-6">
            {/* Mobile: Stack vertically, Desktop: Grid */}
            {filteredDeals.map((deal, index) => (
              <div
                key={deal.id}
                id={`deal-${deal.id}`}
                className={selectedDealIndex === index ? 'ring-2 ring-emerald-500 rounded-xl ring-offset-2 ring-offset-slate-900' : ''}
              >
                <DealCard
                  deal={deal}
                  isSelected={selectedDealIds.has(deal.id)}
                  onToggleSelect={handleToggleDealSelection}
                  canSelect={true}
                  fromView={selectedSource || undefined}
                  onRefresh={() => workspaceId && loadDeals(workspaceId)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Error Message */}
      {errorMsg && !loading && (
        <div className="mt-6">
          <ErrorState
            title="Couldn't load deals"
            message={errorMsg}
            onRetry={() => workspaceId && loadDeals(workspaceId)}
            retryText="Try again"
          />
        </div>
      )}

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        currentContext="dashboard"
      />

      {/* CIM Processing Modal */}
      <CimProcessingModal
        isOpen={showCimProcessingModal}
        onClose={() => {
          setShowCimProcessingModal(false);
          setCimProcessingStage('uploading');
          setCimProcessingStartTime(null);
          if (cimProcessingStage === 'complete') {
            setCimUploadStatus('idle');
          }
        }}
        stage={cimProcessingStage}
        error={cimProcessingError}
        estimatedTimeRemaining={(() => {
          if (!cimProcessingStartTime) return undefined;
          const elapsed = (Date.now() - cimProcessingStartTime) / 1000;
          const typicalTotalTime = 45; // 30-45 seconds typical
          const remaining = Math.max(0, typicalTotalTime - elapsed);
          
          // Adjust based on stage
          if (cimProcessingStage === 'uploading') return Math.max(0, 45 - elapsed);
          if (cimProcessingStage === 'extracting') return Math.max(0, 40 - elapsed);
          if (cimProcessingStage === 'analyzing') return Math.max(0, 30 - elapsed);
          if (cimProcessingStage === 'generating') return Math.max(0, 10 - elapsed);
          if (cimProcessingStage === 'finalizing') return Math.max(0, 5 - elapsed);
          return undefined;
        })()}
        onCancel={() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setCimProcessingStage('error');
            setCimProcessingError('Processing was cancelled.');
            setCimUploadStatus('error');
          }
        }}
      />

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShowShortcutsModal(true)}
          className="text-xs text-slate-500 hover:text-slate-300 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm transition-colors"
          aria-label="Show keyboard shortcuts"
        >
          Press <kbd className="px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-300">?</kbd> for shortcuts
        </button>
      </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-7xl mx-auto bg-slate-900">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-sm text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}
