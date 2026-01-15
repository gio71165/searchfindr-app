'use client';

import { useState, useEffect, useMemo, useRef, type ChangeEvent, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../supabaseClient';
import { DealCard } from '@/components/ui/DealCard';
import { ContentHeader } from '@/components/dashboard/ContentHeader';
import { PipelineSummary } from '@/components/dashboard/PipelineSummary';
import { VerdictFilters } from '@/components/dashboard/VerdictFilters';
import { Upload, DollarSign, Search as SearchIcon } from 'lucide-react';

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

const OFFMARKET_INDUSTRIES = [
  'HVAC',
  'Electrical',
  'Plumbing',
  'Roofing',
  'Landscaping',
  'Pest Control',
  'Commercial Cleaning',
  'Auto Repair',
  'Home Health',
  'Dental / Medical',
  'Logistics / Trucking',
  'Light Manufacturing',
  'Specialty Construction',
];

const ALLOWED_RADIUS = [5, 10, 15, 25, 50, 75, 100];

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

function DashboardPageContent() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

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

  const [finFile, setFinFile] = useState<File | null>(null);
  const finInputRef = useRef<HTMLInputElement | null>(null);
  const [finUploadStatus, setFinUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');
  const [finUploadMsg, setFinUploadMsg] = useState<string | null>(null);

  // Off-market search state
  const [offIndustries, setOffIndustries] = useState<string[]>([]);
  const [offIndustryToAdd, setOffIndustryToAdd] = useState<string>(OFFMARKET_INDUSTRIES[0] ?? 'HVAC');
  const [offCity, setOffCity] = useState('');
  const [offState, setOffState] = useState('TX');
  const [offRadiusMiles, setOffRadiusMiles] = useState<number>(10);
  const [offSearching, setOffSearching] = useState(false);
  const [offSearchStatus, setOffSearchStatus] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/');
          return;
        }

        setEmail(user.email ?? null);
        setUserId(user.id);
        setCheckingAuth(false);
        setLoading(true);
        setErrorMsg(null);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('workspace_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.workspace_id) {
          console.error('profileError:', profileError);
          setErrorMsg('Missing workspace. Please contact support.');
          return;
        }

        setWorkspaceId(profile.workspace_id);
        await loadDeals(profile.workspace_id);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  async function loadDeals(wsId: string) {
    // Try query with archived_at filter first (if migration has been run)
    let query = supabase
      .from('companies')
      .select('*')
      .eq('workspace_id', wsId)
      .is('passed_at', null)
      .is('archived_at', null) // Exclude archived deals
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      // If error is about missing column (migration not run), retry without archived_at filter
      const errorMessage = error.message || '';
      const errorCode = error.code || '';
      const errorHint = error.hint || '';
      
      if (errorMessage.includes('archived_at') || 
          errorMessage.includes('column') || 
          errorCode === '42703' || // undefined_column
          errorHint.includes('archived_at')) {
        // Fallback: query without archived_at filter (for before migration)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('companies')
          .select('*')
          .eq('workspace_id', wsId)
          .is('passed_at', null)
          .order('created_at', { ascending: false });

        if (fallbackError) {
          console.error('loadDeals fallback error:', fallbackError);
          setErrorMsg(`Failed to load deals: ${fallbackError.message || 'Unknown error'}`);
          return;
        }
        setDeals((fallbackData ?? []) as Company[]);
        return;
      }

      console.error('loadDeals error:', error);
      setErrorMsg(`Failed to load deals: ${error.message || 'Unknown error'}`);
      return;
    }

    setDeals((data ?? []) as Company[]);
  }

  // Apply all filters
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
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
  }, [deals, selectedSource, selectedStage, selectedVerdict, searchQuery]);

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

  // Upload handlers
  const handleCimButtonClick = () => cimInputRef.current?.click();
  const handleFinancialsButtonClick = () => finInputRef.current?.click();

  const handleCimFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrorMsg('Please upload a PDF file for the CIM.');
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

    try {
      const fileExt = file.name.split('.').pop() || 'pdf';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage.from('cims').upload(filePath, file);
      if (storageError) {
        console.error('CIM upload error:', storageError);
        setErrorMsg('Failed to upload CIM. Please try again.');
        setCimUploadStatus('error');
        return;
      }

      const cimNameWithoutExt = file.name.replace(/\.pdf$/i, '');

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
        console.error('Error inserting CIM company row:', insertError);
        setErrorMsg('CIM uploaded, but failed to create deal record.');
        setCimUploadStatus('error');
        return;
      }

      await loadDeals(workspaceId);
      setCimUploadStatus('uploaded');
      setCimFile(null);
      setTimeout(() => setCimUploadStatus('idle'), 3000);
    } catch (err) {
      console.error('Unexpected CIM upload error:', err);
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
        console.error('Financials upload error:', storageError);
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
        console.error('Error inserting Financials company row:', insertError);
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
      console.error('Unexpected financials upload error:', err);
      setFinUploadStatus('error');
      setFinUploadMsg(err?.message || 'Unexpected error uploading financials.');
    }
  };

  const handleConnectExtension = () => {
    window.open('/extension/callback', '_blank', 'noopener,noreferrer');
  };

  // Off-market search
  const addIndustry = () => {
    setOffIndustries((prev) => (prev.includes(offIndustryToAdd) ? prev : [...prev, offIndustryToAdd]));
  };
  const removeIndustry = (ind: string) => {
    setOffIndustries((prev) => prev.filter((x) => x !== ind));
  };

  const handleOffMarketSearch = async () => {
    setErrorMsg(null);
    setOffSearchStatus(null);

    const industries = offIndustries;
    const city = offCity.trim();
    const state = offState.trim();
    const radius = Number(offRadiusMiles);

    if (industries.length === 0) {
      setOffSearchStatus('Please add at least one industry.');
      return;
    }
    if (!city) {
      setOffSearchStatus('Please enter a city.');
      return;
    }
    if (!state || state.length !== 2) {
      setOffSearchStatus('Please select a state.');
      return;
    }
    if (!ALLOWED_RADIUS.includes(radius)) {
      setOffSearchStatus('Please select a valid radius.');
      return;
    }

    setOffSearching(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setOffSearchStatus('Not signed in.');
        return;
      }

      const res = await fetch('/api/off-market/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ industries, location: `${city}, ${state}`, radius_miles: radius }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setOffSearchStatus(json.error || 'Search failed.');
        return;
      }

      const count = typeof json.count === 'number' ? json.count : 0;
      setOffSearchStatus(`${count} result(s) added to Off-market (not saved).`);

      await loadDeals(workspaceId!);
    } catch (err: any) {
      console.error('off-market search error:', err);
      setOffSearchStatus(err?.message || 'Search failed.');
    } finally {
      setOffSearching(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm opacity-80">Checking your session…</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ContentHeader
        title={`Welcome${email ? `, ${email.split('@')[0]}` : ''}`}
        description="Quickly evaluate deals and find the good ones"
      />

      {/* Search */}
      <input
        type="text"
        placeholder="Search deals by company name..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-3 border rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Pipeline Summary - Full variant */}
      <PipelineSummary
        selectedStage={selectedStage}
        setSelectedStage={(stage: string) => setSelectedStage(stage as Stage)}
        stageCounts={stageCounts}
        variant="full"
      />

      {/* Verdict & Quick Filters */}
      <VerdictFilters
        selectedVerdict={selectedVerdict}
        setSelectedVerdict={(verdict: string) => setSelectedVerdict(verdict as Verdict)}
      />

      {/* Quick Actions - Subtle row */}
      <div className="flex gap-2 mb-6 text-sm">
        <button
          onClick={handleCimButtonClick}
          className="px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors border border-gray-300"
        >
          Upload CIM
        </button>
        <button
          onClick={handleFinancialsButtonClick}
          className="px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors border border-gray-300"
        >
          Upload Financials
        </button>
      </div>

      {/* Hidden file inputs */}
      <input ref={cimInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleCimFileChange} />
      <input
        ref={finInputRef}
        type="file"
        accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFinancialsFileChange}
      />

      {/* Upload Status Messages */}
      {cimUploadStatus !== 'idle' && (
        <div
          className={`rounded-xl border p-4 mb-4 ${
            cimUploadStatus === 'uploaded'
              ? 'bg-green-50 border-green-200 text-green-700'
              : cimUploadStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          <div className="font-semibold">
            {cimUploadStatus === 'uploading' && 'Uploading CIM…'}
            {cimUploadStatus === 'uploaded' && 'CIM uploaded successfully!'}
            {cimUploadStatus === 'error' && 'CIM upload failed'}
          </div>
          {cimFile && <div className="text-sm mt-1">File: {cimFile.name}</div>}
        </div>
      )}

      {finUploadStatus !== 'idle' && (
        <div
          className={`rounded-xl border p-4 mb-4 ${
            finUploadStatus === 'uploaded'
              ? 'bg-green-50 border-green-200 text-green-700'
              : finUploadStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          <div className="font-semibold">
            {finUploadStatus === 'uploading' && 'Uploading Financials…'}
            {finUploadStatus === 'uploaded' && 'Financials uploaded successfully!'}
            {finUploadStatus === 'error' && 'Financials upload failed'}
          </div>
          {finUploadMsg && <div className="text-sm mt-1">{finUploadMsg}</div>}
        </div>
      )}

      {/* DEAL CARDS */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredDeals.length} of {deals.length} deals
      </div>

      {filteredDeals.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900">No deals match your filters</h3>
          <p className="text-gray-600 mb-6">Try adjusting your filters or add your first deal</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSelectedSource(null);
                setSelectedStage('all');
                setSelectedVerdict('all');
                setSearchQuery('');
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={handleCimButtonClick}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Upload CIM
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeals.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 mt-4">
          {errorMsg}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center">Loading dashboard...</div>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}
