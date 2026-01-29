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
import { ApplyCriteriaFilter } from '@/components/dashboard/ApplyCriteriaFilter';
import { Skeleton } from '@/components/ui/Skeleton';
import { Search as SearchIcon, FileText, TrendingUp } from 'lucide-react';
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

  // Comparison selection handlers
  const handleToggleDealSelection = useCallback((dealId: string) => {
    setSelectedDealIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dealId)) {
        newSet.delete(dealId);
      } else {
        // Max 3 deals can be selected
        if (newSet.size < 3) {
          newSet.add(dealId);
        }
      }
      return newSet;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedDealIds(new Set());
  }, []);

  const handleCompareSelected = useCallback(() => {
    if (selectedDealIds.size >= 2 && selectedDealIds.size <= 3) {
      const idsArray = Array.from(selectedDealIds);
      router.push(`/deals/compare?ids=${idsArray.join(',')}`);
    }
  }, [selectedDealIds, router]);

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
    ],
    true
  );

  if (authLoading || loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-sm text-slate-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
      <div className="mb-6 sm:mb-8" data-onboarding="dashboard-main">
        <ContentHeader
          title={`Welcome${user?.email ? `, ${user.email.split('@')[0]}` : ''}`}
          description="Quickly evaluate deals and find the good ones"
        />
      </div>

      {/* Search */}
      <div className="mb-6 sm:mb-8">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search deals by company name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
          aria-label="Search deals"
        />
      </div>

      {/* Gradient Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* New Deals - Emerald */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="text-sm font-medium opacity-90 mb-1">New Deals</div>
            <div className="text-3xl font-bold">{stageCounts.new || 0}</div>
            {stageCounts.new > 0 && (
              <div className="text-xs opacity-80 mt-2">Review these first</div>
            )}
          </div>
        </div>

        {/* Reviewing - Blue */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="text-sm font-medium opacity-90 mb-1">Reviewing</div>
            <div className="text-3xl font-bold">{stageCounts.reviewing || 0}</div>
            {stageCounts.reviewing > 0 && (
              <div className="text-xs opacity-80 mt-2">In analysis</div>
            )}
          </div>
        </div>

        {/* Active Pipeline - Purple */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="text-sm font-medium opacity-90 mb-1">In Pipeline</div>
            <div className="text-3xl font-bold">
              {(stageCounts.follow_up || 0) + (stageCounts.ioi_sent || 0) + (stageCounts.loi || 0) + (stageCounts.dd || 0)}
            </div>
            <div className="text-xs opacity-80 mt-2">Active deals</div>
          </div>
        </div>

        {/* Passed - Slate */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-500 to-slate-600 text-white rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="text-sm font-medium opacity-90 mb-1">Passed</div>
            <div className="text-3xl font-bold">{stageCounts.passed || 0}</div>
            <div className="text-xs opacity-80 mt-2">Declined</div>
          </div>
        </div>
      </div>

      {/* Saved Filters */}
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

      {/* Compact Filter Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 space-y-3" data-onboarding="filter-buttons">
        {/* Verdict filters */}
        <VerdictFilters
          selectedVerdict={selectedVerdict}
          setSelectedVerdict={(verdict: string) => setSelectedVerdict(verdict as Verdict)}
        />

        {/* Stage filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-600">Stage:</span>
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
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${selectedStage === stage.value
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {stage.label}
            </button>
          ))}
        </div>

        {/* Source filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-600">Source:</span>
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
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${selectedSource === source.value
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {source.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions - Enhanced styling */}
      <div className="flex flex-wrap gap-3 mb-6 sm:mb-8">
        <button
          onClick={handleCimButtonClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-all border-2 border-slate-300 hover:border-slate-400 hover:shadow-md touch-manipulation"
        >
          <FileText className="h-4 w-4 flex-shrink-0" />
          <span>Upload CIM</span>
        </button>
        <button
          onClick={handleFinancialsButtonClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-all border-2 border-slate-300 hover:border-slate-400 hover:shadow-md touch-manipulation"
        >
          <TrendingUp className="h-4 w-4 flex-shrink-0" />
          <span>Upload Financials</span>
        </button>
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
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : cimUploadStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
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
            <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : finUploadStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
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
          
          {/* Comparison Actions (if 2-3 deals selected) */}
          {selectedDealIds.size >= 2 && selectedDealIds.size <= 3 && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">
                Compare {selectedDealIds.size} deals side-by-side
              </span>
              <button
                onClick={handleCompareSelected}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
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
          icon={FileText}
          title="No deals yet!"
          description="Upload your first CIM to get started. SearchFindr will analyze it and help you identify the best opportunities."
          actionLabel="Upload CIM"
          onAction={handleCimButtonClick}
          secondaryActionLabel="Upload Financials"
          onSecondaryAction={handleFinancialsButtonClick}
        />
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
          <div className="mb-6 text-sm font-medium text-slate-600">
            Showing <span className="font-semibold text-slate-900">{filteredDeals.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{criteriaFilteredDeals !== null ? criteriaFilteredDeals.length : deals.length}</span> deals
            {activeCriteria && (
              <span className="ml-2 text-blue-600">
                (filtered by "{activeCriteria.name}")
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Mobile: Stack vertically, Desktop: Grid */}
            {filteredDeals.map((deal, index) => (
              <div
                key={deal.id}
                id={`deal-${deal.id}`}
                className={selectedDealIndex === index ? 'ring-2 ring-blue-500 rounded-xl' : ''}
              >
                <DealCard
                  deal={deal}
                  isSelected={selectedDealIds.has(deal.id)}
                  onToggleSelect={handleToggleDealSelection}
                  canSelect={selectedDealIds.size < 3 || selectedDealIds.has(deal.id)}
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
          className="text-xs text-slate-500 hover:text-slate-700 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors"
          aria-label="Show keyboard shortcuts"
        >
          Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs">?</kbd> for shortcuts
        </button>
      </div>

    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-sm text-slate-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}
