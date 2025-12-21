// app/dashboard/page.tsx
'use client';

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../supabaseClient';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  owner_name?: string | null;
};

type DashboardView = 'saved' | 'on_market' | 'off_market' | 'cim_pdf' | 'financials';
const DEFAULT_VIEW: DashboardView = 'saved';

function isDashboardView(v: any): v is DashboardView {
  return v === 'saved' || v === 'on_market' || v === 'off_market' || v === 'cim_pdf' || v === 'financials';
}

function formatSource(source: string | null): string {
  if (!source) return '';
  if (source === 'on_market') return 'On-market';
  if (source === 'off_market') return 'Off-market';
  if (source === 'cim_pdf') return 'CIM (PDF)';
  if (source === 'financials') return 'Financials';
  return source;
}

function formatLocation(city: string | null, state: string | null): string {
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return '';
}

function getColSpanForView(view: DashboardView) {
  switch (view) {
    case 'on_market':
      return 6;
    case 'off_market':
      return 4;
    case 'cim_pdf':
      return 4;
    case 'financials':
      return 4;
    case 'saved':
    default:
      return 4;
  }
}

function TierPill({ tier }: { tier: string | null }) {
  if (!tier) return null;
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide bg-amber-500/5 border-amber-500/40 text-amber-700">
      Tier {tier}
    </span>
  );
}

function EmptyStateCard({
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="p-6">
      <div className="rounded-xl border bg-transparent p-6">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs opacity-80">{description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-main" onClick={onPrimary}>
            {primaryLabel}
          </button>

          {secondaryLabel && onSecondary ? (
            <button className="text-xs underline opacity-80" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const US_STATES = [
  { abbr: 'AL', name: 'Alabama' },
  { abbr: 'AK', name: 'Alaska' },
  { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'AR', name: 'Arkansas' },
  { abbr: 'CA', name: 'California' },
  { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' },
  { abbr: 'DE', name: 'Delaware' },
  { abbr: 'FL', name: 'Florida' },
  { abbr: 'GA', name: 'Georgia' },
  { abbr: 'HI', name: 'Hawaii' },
  { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' },
  { abbr: 'IN', name: 'Indiana' },
  { abbr: 'IA', name: 'Iowa' },
  { abbr: 'KS', name: 'Kansas' },
  { abbr: 'KY', name: 'Kentucky' },
  { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' },
  { abbr: 'MD', name: 'Maryland' },
  { abbr: 'MA', name: 'Massachusetts' },
  { abbr: 'MI', name: 'Michigan' },
  { abbr: 'MN', name: 'Minnesota' },
  { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' },
  { abbr: 'MT', name: 'Montana' },
  { abbr: 'NE', name: 'Nebraska' },
  { abbr: 'NV', name: 'Nevada' },
  { abbr: 'NH', name: 'New Hampshire' },
  { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' },
  { abbr: 'NY', name: 'New York' },
  { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'ND', name: 'North Dakota' },
  { abbr: 'OH', name: 'Ohio' },
  { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' },
  { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' },
  { abbr: 'SC', name: 'South Carolina' },
  { abbr: 'SD', name: 'South Dakota' },
  { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' },
  { abbr: 'UT', name: 'Utah' },
  { abbr: 'VT', name: 'Vermont' },
  { abbr: 'VA', name: 'Virginia' },
  { abbr: 'WA', name: 'Washington' },
  { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' },
  { abbr: 'WY', name: 'Wyoming' },
];

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

export default function DashboardPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const [loadingDeals, setLoadingDeals] = useState(true);
  const [deals, setDeals] = useState<Company[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const [selectedView, setSelectedView] = useState<DashboardView>(DEFAULT_VIEW);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view');

    if (isDashboardView(urlView)) {
      setSelectedView(urlView);
      localStorage.setItem('dashboard_view', urlView);
      return;
    }

    const stored = localStorage.getItem('dashboard_view');
    if (isDashboardView(stored)) {
      setSelectedView(stored);
      router.replace(`/dashboard?view=${stored}`);
      return;
    }

    localStorage.setItem('dashboard_view', DEFAULT_VIEW);
    router.replace(`/dashboard?view=${DEFAULT_VIEW}`);
  }, [router]);

  const changeView = (view: DashboardView) => {
    setSelectedView(view);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_view', view);
    }
    router.replace(`/dashboard?view=${view}`);
  };

  // CIM upload state
  const [cimFile, setCimFile] = useState<File | null>(null);
  const cimInputRef = useRef<HTMLInputElement | null>(null);
  const [cimUploadStatus, setCimUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');

  // Financials upload state (UPDATED - upload only, no AI)
  const [finFile, setFinFile] = useState<File | null>(null);
  const finInputRef = useRef<HTMLInputElement | null>(null);
  const [finUploadStatus, setFinUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');
  const [finUploadMsg, setFinUploadMsg] = useState<string | null>(null);

  // ✅ Off-market search state (dropdown + add/remove)
  const [offIndustries, setOffIndustries] = useState<string[]>([]);
  const [offIndustryToAdd, setOffIndustryToAdd] = useState<string>(OFFMARKET_INDUSTRIES[0] ?? 'HVAC');

  const [offCity, setOffCity] = useState('');
  const [offState, setOffState] = useState('TX');
  const [offRadiusMiles, setOffRadiusMiles] = useState<number>(10);

  const [offSearching, setOffSearching] = useState(false);
  const [offSearchStatus, setOffSearchStatus] = useState<string | null>(null);

  const addIndustry = () => {
    setOffIndustries((prev) => (prev.includes(offIndustryToAdd) ? prev : [...prev, offIndustryToAdd]));
  };

  const removeIndustry = (ind: string) => {
    setOffIndustries((prev) => prev.filter((x) => x !== ind));
  };

  const locationString = `${offCity.trim()}, ${offState}`;

  const refreshDeals = async () => {
    if (!workspaceId) return;

    setErrorMsg(null);
    setRefreshing(true);

    const { data, error } = await supabase
      .from('companies')
      .select(
        `
          id,
          company_name,
          location_city,
          location_state,
          industry,
          source_type,
          score,
          final_tier,
          listing_url,
          created_at,
          is_saved
        `
      )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    setRefreshing(false);

    if (error) {
      console.error('refreshDeals error:', error);
      setErrorMsg('Failed to refresh deals.');
      return;
    }

    setDeals((data ?? []) as Company[]);
  };

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
        setLoadingDeals(true);
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

        const { data, error } = await supabase
          .from('companies')
          .select(
            `
              id,
              company_name,
              location_city,
              location_state,
              industry,
              source_type,
              score,
              final_tier,
              listing_url,
              created_at,
              is_saved
            `
          )
          .eq('workspace_id', profile.workspace_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('companies error:', error);
          setErrorMsg('Failed to load deals.');
          return;
        }

        setDeals((data ?? []) as Company[]);
      } finally {
        setLoadingDeals(false);
      }
    };

    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const handleDelete = async (id: string) => {
    const yes = window.confirm('Delete this deal? This cannot be undone.');
    if (!yes) return;

    setErrorMsg(null);

    const { error } = await supabase.from('companies').delete().eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      setErrorMsg(error.message || 'Failed to delete deal.');
      return;
    }

    setDeals((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSave = async (id: string) => {
    setErrorMsg(null);

    const { error } = await supabase.from('companies').update({ is_saved: true }).eq('id', id);

    if (error) {
      console.error('Save error:', error);
      setErrorMsg(error.message || 'Failed to save company.');
      return;
    }

    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, is_saved: true } : d)));
  };

  const handleRemoveFromSaved = async (id: string) => {
    setErrorMsg(null);

    const { error } = await supabase.from('companies').update({ is_saved: false }).eq('id', id);

    if (error) {
      console.error('Unsave error:', error);
      setErrorMsg(error.message || 'Failed to remove from Saved Companies.');
      return;
    }

    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, is_saved: false } : d)));
  };

  const filteredDeals =
    selectedView === 'saved'
      ? deals.filter((d) => d.is_saved === true)
      : deals.filter((deal) => {
          if (selectedView === 'cim_pdf') return deal.source_type === 'cim_pdf';
          if (selectedView === 'financials') return deal.source_type === 'financials';
          return deal.source_type === selectedView;
        });

  const handleCimButtonClick = () => {
    cimInputRef.current?.click();
  };

  const handleFinancialsButtonClick = () => {
    finInputRef.current?.click();
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          industries,
          location: `${city}, ${state}`,
          radius_miles: radius,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setOffSearchStatus(json.error || 'Search failed.');
        return;
      }

      const count = typeof json.count === 'number' ? json.count : 0;
      setOffSearchStatus(`${count} result(s) added to Off-market (not saved).`);

      await refreshDeals();
    } catch (err: any) {
      console.error('off-market search error:', err);
      setOffSearchStatus(err?.message || 'Search failed.');
    } finally {
      setOffSearching(false);
    }
  };

  const handleCimFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrorMsg('Please upload a PDF file for the CIM.');
      setCimFile(null);
      setCimUploadStatus('error');
      return;
    }

    if (!userId) {
      setErrorMsg('User not loaded yet. Please try again.');
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

      setCimUploadStatus('uploaded');

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

        // best-effort cleanup so you don't leave orphaned files
        try {
          const pathToRemove = storageData?.path || filePath;
          await supabase.storage.from('cims').remove([pathToRemove]);
        } catch (cleanupErr) {
          console.warn('CIM cleanup failed:', cleanupErr);
        }

        return;
      }

      const newId = insertData.id as string;

      setDeals((prev) => [
        {
          id: newId,
          company_name: cimNameWithoutExt || 'CIM Deal',
          location_city: null,
          location_state: null,
          industry: null,
          source_type: 'cim_pdf',
          score: null,
          final_tier: null,
          listing_url: null,
          created_at: new Date().toISOString(),
          is_saved: false,
        },
        ...prev,
      ]);

      setCimUploadStatus('uploaded');
      setCimFile(null);
    } catch (err) {
      console.error('Unexpected CIM upload error:', err);
      setErrorMsg('Unexpected error uploading CIM.');
      setCimUploadStatus('error');
    }
  };

  /**
   * UPDATED: Financials upload should behave like CIM:
   * - Upload to Supabase Storage bucket: `financials`
   * - Insert/update a row in companies with file metadata (NO AI run here)
   */
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

      // 1) Upload file bytes to Storage bucket: financials
      const { data: storageData, error: storageError } = await supabase.storage.from('financials').upload(filePath, file);

      if (storageError) {
        console.error('Financials upload error:', storageError);
        setErrorMsg('Failed to upload Financials. Please try again.');
        setFinUploadStatus('error');
        setFinUploadMsg(storageError.message || 'Upload failed.');
        return;
      }

      const storedPath = storageData?.path || filePath;

      // 2) Create the deal row (no AI run here)
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

        // best-effort cleanup to avoid orphaned file
        try {
          await supabase.storage.from('financials').remove([storedPath]);
        } catch (cleanupErr) {
          console.warn('Financials cleanup failed:', cleanupErr);
        }

        return;
      }

      const newId = insertData.id as string;

      // optimistic add to UI
      setDeals((prev) => [
        {
          id: newId,
          company_name: dealName,
          location_city: null,
          location_state: null,
          industry: null,
          source_type: 'financials',
          score: null,
          final_tier: null,
          listing_url: null,
          created_at: new Date().toISOString(),
          is_saved: false,
        },
        ...prev,
      ]);

      setFinUploadStatus('uploaded');
      setFinUploadMsg('Uploaded & deal created. Open the deal to run Financial Analysis.');
      setFinFile(null);
    } catch (err: any) {
      console.error('Unexpected financials upload error:', err);
      setFinUploadStatus('error');
      setFinUploadMsg(err?.message || 'Unexpected error uploading financials.');
    }
  };

const handleConnectExtension = () => {
  window.open('/extension/callback', '_blank', 'noopener,noreferrer');
};

  const renderEmptyStateForView = () => {
    if (selectedView === 'saved') {
      return (
        <EmptyStateCard
          title="No saved deals yet"
          description="Save deals from On-market, Off-market, CIM uploads, or Financials uploads to build your pipeline."
          primaryLabel="Go to On-market"
          onPrimary={() => changeView('on_market')}
          secondaryLabel="Go to Off-market"
          onSecondary={() => changeView('off_market')}
        />
      );
    }

    if (selectedView === 'on_market') {
      return (
        <EmptyStateCard
          title="No on-market deals yet"
          description="Use the Chrome extension to analyze live listings and send them here."
          primaryLabel="Connect Chrome extension"
          onPrimary={handleConnectExtension}
          secondaryLabel="Go to CIM upload"
          onSecondary={() => changeView('cim_pdf')}
        />
      );
    }

    if (selectedView === 'off_market') {
      return (
        <EmptyStateCard
          title="No off-market results yet"
          description="Search by industry + geography to surface owner-operated SMBs."
          primaryLabel="Run a search below"
          onPrimary={() => {
            setOffSearchStatus(offSearchStatus ?? 'Add industries + city/state, then click Search.');
          }}
          secondaryLabel="Go to Saved"
          onSecondary={() => changeView('saved')}
        />
      );
    }

    if (selectedView === 'financials') {
      return (
        <EmptyStateCard
          title="No financial uploads yet"
          description="Upload financials and run a financial quality analysis (risks, strengths, missing items)."
          primaryLabel="Upload Financials"
          onPrimary={handleFinancialsButtonClick}
          secondaryLabel="Go to CIM uploads"
          onSecondary={() => changeView('cim_pdf')}
        />
      );
    }

    // cim_pdf
    return (
      <EmptyStateCard
        title="No CIM uploads yet"
        description="Upload a CIM to generate an AI investment memo."
        primaryLabel="Upload CIM (PDF)"
        onPrimary={handleCimButtonClick}
        secondaryLabel="Go to On-market"
        onSecondary={() => changeView('on_market')}
      />
    );
  };

  if (checkingAuth) {
    return (
      <main className="py-12 text-center">
        <p className="text-sm">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="space-y-6 py-6 px-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Deals</h1>
          <p className="text-sm">Search + early diligence workspace. Nothing is “Saved” unless you explicitly save it.</p>
        </div>
        <div className="flex items-center gap-3">
          {email && (
            <span className="text-xs">
              Signed in as <span className="font-mono">{email}</span>
            </span>
          )}
          <ThemeToggle />
          <button onClick={handleConnectExtension} className="btn-main">
            Connect Chrome Extension
          </button>
          <button onClick={handleLogout} className="btn-main">
            Log out
          </button>
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <button className="btn-main" onClick={handleCimButtonClick}>
            Upload CIM (PDF)
          </button>

          <input ref={cimInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleCimFileChange} />

          <button className="btn-main" onClick={handleFinancialsButtonClick}>
            Upload Financials
          </button>

          <input
            ref={finInputRef}
            type="file"
            accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleFinancialsFileChange}
          />

          <button className="btn-main" onClick={refreshDeals} disabled={refreshing || loadingDeals || !workspaceId}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {cimFile && (
          <p className="text-xs">
            CIM selected: <span className="font-medium">{cimFile.name}</span>{' '}
            {cimUploadStatus === 'uploading' && <span className="text-[11px] text-muted-foreground">(uploading…)</span>}
            {cimUploadStatus === 'uploaded' && <span className="text-[11px] text-green-600"> – uploaded & deal created</span>}
            {cimUploadStatus === 'error' && <span className="text-[11px] text-red-600"> – upload failed</span>}
          </p>
        )}

        {finFile && (
          <p className="text-xs">
            Financials selected: <span className="font-medium">{finFile.name}</span>{' '}
            {finUploadStatus === 'uploading' && <span className="text-[11px] text-muted-foreground">(uploading…)</span>}
            {finUploadStatus === 'uploaded' && <span className="text-[11px] text-green-600"> – uploaded & deal created</span>}
            {finUploadStatus === 'error' && <span className="text-[11px] text-red-600"> – upload failed</span>}
            {finUploadMsg ? <span className="text-[11px] opacity-80"> — {finUploadMsg}</span> : null}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2 text-xs">
          {(['saved', 'on_market', 'off_market', 'cim_pdf', 'financials'] as const).map((view) => {
            const isActive = selectedView === view;
            const label =
              view === 'saved'
                ? 'Saved Companies'
                : view === 'on_market'
                ? 'On-market'
                : view === 'off_market'
                ? 'Off-market'
                : view === 'cim_pdf'
                ? 'CIMs'
                : 'Financials';

            return (
              <button key={view} onClick={() => changeView(view)} className={`view-pill ${isActive ? 'view-pill--active' : ''}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedView === 'off_market' && (
        <section className="card-table p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Off-market discovery</h2>
            <p className="text-xs opacity-80">
              Add industries from the dropdown + enter city/state + choose radius. Results appear in Off-market, then you decide what to save.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs opacity-80">Industries</label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <select
                  className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm"
                  value={offIndustryToAdd}
                  onChange={(e) => setOffIndustryToAdd(e.target.value)}
                >
                  {OFFMARKET_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>

                <button type="button" className="btn-main" onClick={addIndustry}>
                  Add
                </button>
              </div>

              {offIndustries.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {offIndustries.map((ind) => (
                    <span key={ind} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                      {ind}
                      <button type="button" className="text-[11px] underline" onClick={() => removeIndustry(ind)}>
                        remove
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs opacity-70">Add at least one industry to search.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs opacity-80">City</label>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm"
                value={offCity}
                onChange={(e) => setOffCity(e.target.value)}
                placeholder="e.g. Austin"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs opacity-80">State</label>
              <select className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm" value={offState} onChange={(e) => setOffState(e.target.value)}>
                {US_STATES.map((s) => (
                  <option key={s.abbr} value={s.abbr}>
                    {s.abbr} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs opacity-80">Radius (miles)</label>
              <select
                className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm"
                value={offRadiusMiles}
                onChange={(e) => setOffRadiusMiles(Number(e.target.value))}
              >
                {ALLOWED_RADIUS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-main" onClick={handleOffMarketSearch} disabled={offSearching}>
              {offSearching ? 'Searching…' : 'Search'}
            </button>

            <span className="text-xs opacity-80">Location: {locationString}</span>

            {offSearchStatus && <span className="text-xs opacity-80">{offSearchStatus}</span>}
          </div>
        </section>
      )}

      <section className="mt-4 card-table">
        <div className="mb-4 flex items-center justify-between px-4 pt-4">
          <h2 className="text-sm font-semibold">{selectedView === 'saved' ? 'Saved companies' : 'Companies'}</h2>
          {loadingDeals ? (
            <p className="text-xs">Loading…</p>
          ) : (
            <p className="text-xs">{filteredDeals.length === 0 ? 'No companies yet.' : `${filteredDeals.length} company(s) shown.`}</p>
          )}
        </div>

        {errorMsg && <p className="px-4 pb-2 text-xs text-red-600">{errorMsg}</p>}

        {loadingDeals ? (
          <div className="px-4 pb-4">
            <div className="rounded-xl border p-4 text-xs opacity-80">Loading…</div>
          </div>
        ) : filteredDeals.length === 0 ? (
          renderEmptyStateForView()
        ) : (
          <div className="overflow-x-auto px-4 pb-4">
            <table className="min-w-full text-left text-xs">
              <thead className="table-header">
                <tr>
                  {selectedView === 'saved' && (
                    <>
                      <th className="px-2 py-1.5 font-medium">Company</th>
                      <th className="px-2 py-1.5 font-medium">Source</th>
                      <th className="px-2 py-1.5 font-medium">Created</th>
                      <th className="px-2 py-1.5 font-medium text-right"></th>
                    </>
                  )}

                  {selectedView === 'on_market' && (
                    <>
                      <th className="px-2 py-1.5 font-medium">Company</th>
                      <th className="px-2 py-1.5 font-medium">Location</th>
                      <th className="px-2 py-1.5 font-medium">Industry</th>
                      <th className="px-2 py-1.5 font-medium">Tier</th>
                      <th className="px-2 py-1.5 font-medium">Created</th>
                      <th className="px-2 py-1.5 font-medium text-right"></th>
                    </>
                  )}

                  {selectedView === 'off_market' && (
                    <>
                      <th className="px-2 py-1.5 font-medium">Company</th>
                      <th className="px-2 py-1.5 font-medium">Owner</th>
                      <th className="px-2 py-1.5 font-medium">Created</th>
                      <th className="px-2 py-1.5 font-medium text-right"></th>
                    </>
                  )}

                  {selectedView === 'cim_pdf' && (
                    <>
                      <th className="px-2 py-1.5 font-medium">Company</th>
                      <th className="px-2 py-1.5 font-medium">Tier</th>
                      <th className="px-2 py-1.5 font-medium">Created</th>
                      <th className="px-2 py-1.5 font-medium text-right"></th>
                    </>
                  )}

                  {selectedView === 'financials' && (
                    <>
                      <th className="px-2 py-1.5 font-medium">Company</th>
                      <th className="px-2 py-1.5 font-medium">Created</th>
                      <th className="px-2 py-1.5 font-medium text-right"></th>
                      <th className="px-2 py-1.5 font-medium text-right"></th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredDeals.map((deal) => (
                  <tr key={deal.id} className="table-row">
                    {selectedView === 'saved' && (
                      <>
                        <td className="px-2 py-2">
                          <Link href={`/deals/${deal.id}?from_view=${selectedView}`} className="underline">
                            {deal.company_name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-2 py-2">{formatSource(deal.source_type)}</td>
                        <td className="px-2 py-2">{deal.created_at ? new Date(deal.created_at).toLocaleDateString() : ''}</td>
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromSaved(deal.id);
                            }}
                            className="text-[11px] underline"
                          >
                            Remove
                          </button>
                        </td>
                      </>
                    )}

                    {selectedView === 'on_market' && (
                      <>
                        <td className="px-2 py-2">
                          <Link href={`/deals/${deal.id}?from_view=${selectedView}`} className="underline">
                            {deal.company_name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-2 py-2">{formatLocation(deal.location_city, deal.location_state)}</td>
                        <td className="px-2 py-2">{deal.industry || ''}</td>
                        <td className="px-2 py-2">
                          <TierPill tier={deal.final_tier} />
                        </td>
                        <td className="px-2 py-2">{deal.created_at ? new Date(deal.created_at).toLocaleDateString() : ''}</td>
                        <td className="px-2 py-2 text-right space-x-3">
                          {deal.is_saved ? null : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSave(deal.id);
                              }}
                              className="text-[11px] underline"
                            >
                              Save
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(deal.id);
                            }}
                            className="text-red-500 text-[11px] underline"
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}

                    {selectedView === 'off_market' && (
                      <>
                        <td className="px-2 py-2">
                          <Link href={`/deals/${deal.id}?from_view=${selectedView}`} className="underline">
                            {deal.company_name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-2 py-2">{deal.owner_name || ''}</td>
                        <td className="px-2 py-2">{deal.created_at ? new Date(deal.created_at).toLocaleDateString() : ''}</td>
                        <td className="px-2 py-2 text-right space-x-3">
                          {deal.is_saved ? null : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSave(deal.id);
                              }}
                              className="text-[11px] underline"
                            >
                              Save
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(deal.id);
                            }}
                            className="text-red-500 text-[11px] underline"
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}

                    {selectedView === 'cim_pdf' && (
                      <>
                        <td className="px-2 py-2">
                          <Link href={`/deals/${deal.id}?from_view=${selectedView}`} className="underline">
                            {deal.company_name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-2 py-2">
                          <TierPill tier={deal.final_tier} />
                        </td>
                        <td className="px-2 py-2">{deal.created_at ? new Date(deal.created_at).toLocaleDateString() : ''}</td>
                        <td className="px-2 py-2 text-right space-x-3">
                          {deal.is_saved ? null : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSave(deal.id);
                              }}
                              className="text-[11px] underline"
                            >
                              Save
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(deal.id);
                            }}
                            className="text-red-500 text-[11px] underline"
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}

                    {selectedView === 'financials' && (
                      <>
                        <td className="px-2 py-2">
                          <Link href={`/deals/${deal.id}?from_view=${selectedView}`} className="underline">
                            {deal.company_name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-2 py-2">{deal.created_at ? new Date(deal.created_at).toLocaleDateString() : ''}</td>
                        <td className="px-2 py-2 text-right">
                          {deal.is_saved ? null : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSave(deal.id);
                              }}
                              className="text-[11px] underline"
                            >
                              Save
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(deal.id);
                            }}
                            className="text-red-500 text-[11px] underline"
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* if you ever want a “colspan” row later */}
            <div className="hidden">
              <span>{getColSpanForView(selectedView)}</span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
