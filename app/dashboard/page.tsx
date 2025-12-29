// app/dashboard/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState, useCallback, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../supabaseClient';
import { ThemeToggle } from '@/components/ThemeToggle';

// ✅ Keep import so backend/dev plumbing stays intact (even though UI is “Coming soon”)
import { searchOnMarket, type OnMarketDeal } from '@/lib/onmarket/client';

type ConfidenceLevel = 'low' | 'medium' | 'high';

type AIConfidence = {
  level?: ConfidenceLevel | null;
  icon?: '⚠️' | '◑' | '●' | null;
  summary?: string | null;
  signals?: Array<{ label: string; value: string }> | null;
  source?: string | null;
  updated_at?: string | null;
} | null;

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
  ai_summary?: string | null;
  ai_confidence_json?: AIConfidence;
};

// Views
type DashboardView = 'saved' | 'on_market' | 'off_market' | 'cim_pdf' | 'financials' | 'on_market_global';
const DEFAULT_VIEW: DashboardView = 'saved';

function isDashboardView(v: any): v is DashboardView {
  return v === 'saved' || v === 'on_market' || v === 'off_market' || v === 'cim_pdf' || v === 'financials' || v === 'on_market_global';
}

function formatSource(source: string | null): string {
  if (!source) return '';
  if (source === 'on_market') return 'On-market (Extension)';
  if (source === 'off_market') return 'Off-market (Targets)';
  if (source === 'cim_pdf') return 'CIM Upload';
  if (source === 'financials') return 'Financial Upload';
  return source;
}

function formatLocation(city: string | null, state: string | null): string {
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return '';
}

function formatCreated(created_at: string | null): string {
  if (!created_at) return '';
  try {
    return new Date(created_at).toLocaleDateString();
  } catch {
    return '';
  }
}

function clampText(s: string, max = 90) {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

function isTierApplicableSource(source_type: string | null | undefined) {
  return source_type === 'on_market' || source_type === 'off_market';
}

function normalizeConfidence(ai: AIConfidence): { icon: '⚠️' | '◑' | '●'; label: string; reason: string; level?: ConfidenceLevel } | null {
  if (!ai) return null;

  const lvl = (ai.level || '').toLowerCase() as ConfidenceLevel;

  const iconFromLevel: Record<ConfidenceLevel, '⚠️' | '◑' | '●'> = {
    low: '⚠️',
    medium: '◑',
    high: '●',
  };

  const icon = ((ai.icon as any) || iconFromLevel[lvl] || '◑') as '⚠️' | '◑' | '●';
  const labelCore = lvl === 'high' ? 'High' : lvl === 'medium' ? 'Medium' : lvl === 'low' ? 'Low' : 'Medium';

  const reason =
    (ai.summary && String(ai.summary).trim()) ||
    (ai.signals && ai.signals.length > 0
      ? ai.signals
          .slice(0, 2)
          .map((s) => `${s.label}: ${s.value}`)
          .join(' • ')
      : '') ||
    'Based on completeness/quality of available inputs.';

  return { icon, label: `Data confidence: ${labelCore}`, reason, level: lvl };
}

function getDashboardConfidence(deal: Company): {
  icon: '⚠️' | '◑' | '●';
  label: string;
  reason: string;
  level?: ConfidenceLevel;
  analyzed: boolean;
} {
  const normalized = normalizeConfidence(deal.ai_confidence_json ?? null);
  if (normalized) return { ...normalized, analyzed: true };

  return {
    icon: '◑',
    label: 'Data confidence: Not analyzed',
    reason: 'No analysis run yet. Open the deal and click “Run AI” to generate signals.',
    analyzed: false,
  };
}

function getDashboardWhyItMatters(deal: Company): string {
  const fromSummary = clampText(deal.ai_summary || '', 90);
  if (fromSummary) return fromSummary;

  const fromConfidence = clampText(deal.ai_confidence_json?.summary || '', 90);
  if (fromConfidence) return fromConfidence;

  if (deal.source_type === 'off_market') return 'Lead surfaced — open to review surface signals.';
  if (deal.source_type === 'financials') return 'Upload received — open the deal to run financial analysis.';
  if (deal.source_type === 'cim_pdf') return 'CIM uploaded — open the deal to generate memo + labels.';
  if (deal.source_type === 'on_market') return 'Listing captured — open to screen risks + missing info.';

  return 'Open to run analysis and generate prioritization signals.';
}

function TierPill({ tier }: { tier: string | null }) {
  if (!tier) return null;
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide bg-amber-500/5 border-amber-500/40 text-amber-700">
      Tier {tier}
    </span>
  );
}

function ConfidencePill({
  icon,
  label,
  title,
  level,
  analyzed,
}: {
  icon: '⚠️' | '◑' | '●';
  label: string;
  title: string;
  level?: ConfidenceLevel;
  analyzed: boolean;
}) {
  const base = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium';

  const cls = !analyzed
    ? `${base} border-slate-500/30 bg-transparent text-slate-500`
    : level === 'low' || icon === '⚠️'
      ? `${base} border-red-500/40 bg-red-500/5 text-red-700`
      : level === 'high' || icon === '●'
        ? `${base} border-emerald-500/40 bg-emerald-500/5 text-emerald-700`
        : `${base} border-blue-500/40 bg-blue-500/5 text-blue-700`;

  return (
    <span className={cls} title={title}>
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
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

function ComingSoonPanel({
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
    <section className="mt-4">
      <div className="rounded-2xl border p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium opacity-80">
            <span aria-hidden>⏳</span>
            <span>Coming soon</span>
          </div>

          <h2 className="mt-4 text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm opacity-80">{description}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className="btn-main" onClick={onPrimary}>
              {primaryLabel}
            </button>

            {secondaryLabel && onSecondary ? (
              <button className="text-sm underline opacity-80" onClick={onSecondary}>
                {secondaryLabel}
              </button>
            ) : null}
          </div>

          <div className="mt-6 rounded-xl border bg-slate-500/5 p-4 text-xs opacity-80">
            <div className="font-medium">Why you’re seeing this</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>We’re keeping the backend plumbing in place for dev velocity.</li>
              <li>During beta, the product is “analyze deals faster”, not “daily deal delivery”.</li>
              <li>If you want value today: capture a deal with the extension, or upload a CIM/financials.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
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

// Tier helpers for sorting/filtering
type TierFilter = 'all' | 'A' | 'B' | 'C' | 'unrated';
type SortKey = 'newest' | 'oldest' | 'tier_high_to_low' | 'tier_low_to_high' | 'company_az' | 'company_za';

function tierRank(tier: string | null | undefined): number {
  const t = (tier || '').toUpperCase();
  if (t === 'A') return 1;
  if (t === 'B') return 2;
  if (t === 'C') return 3;
  return 999;
}

function normalizeName(s: string | null | undefined): string {
  return (s || '').trim().toLowerCase();
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

  // Bulk selection (companies table only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Dashboard triage controls
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');

  // Tier controls only apply to companies-based views
  const tierControlsEnabled = selectedView === 'on_market' || selectedView === 'off_market' || selectedView === 'saved';

  // ✅ Keep Global OM state (unused in UI) so dev plumbing remains easy
  const [_omDeals, _setOmDeals] = useState<OnMarketDeal[]>([]);
  const [_omLoading, _setOmLoading] = useState(false);
  const [_omError, _setOmError] = useState<string | null>(null);
  const [_omHasSearched, _setOmHasSearched] = useState(false);
  const [_omIncludeUnknownLocation, _setOmIncludeUnknownLocation] = useState(true);

  // CIM upload state
  const [cimFile, setCimFile] = useState<File | null>(null);
  const cimInputRef = useRef<HTMLInputElement | null>(null);
  const [cimUploadStatus, setCimUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');

  // Financials upload state
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

  // ✅ Change view from URL/localStorage (KEEP EXACT BEHAVIOR)
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
    setSelectedIds(new Set());
    setTierFilter('all');
    setSortKey('newest');
    setErrorMsg(null);

    // Keep behavior: do not auto-run anything for global.
    if (typeof window !== 'undefined') localStorage.setItem('dashboard_view', view);
    router.replace(`/dashboard?view=${view}`);
  };

  // Off-market industries chip control
  const addIndustry = () => {
    setOffIndustries((prev) => (prev.includes(offIndustryToAdd) ? prev : [...prev, offIndustryToAdd]));
  };
  const removeIndustry = (ind: string) => {
    setOffIndustries((prev) => prev.filter((x) => x !== ind));
  };

  const locationString = `${offCity.trim() || '—'}, ${offState}`;

  const refreshDeals = useCallback(async () => {
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
          is_saved,
          owner_name,
          ai_summary,
          ai_confidence_json
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
  }, [workspaceId]);

  // ✅ Auth + initial deals load
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

        const { data: profile, error: profileError } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single();

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
              is_saved,
              owner_name,
              ai_summary,
              ai_confidence_json
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

  // Bulk actions (companies only)
  const clearSelection = () => setSelectedIds(new Set());

  const bulkSaveSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setErrorMsg(null);
    setBulkBusy(true);
    try {
      const { error } = await supabase.from('companies').update({ is_saved: true }).in('id', ids);
      if (error) {
        console.error('bulk save error:', error);
        setErrorMsg(error.message || 'Failed to save selected companies.');
        return;
      }

      setDeals((prev) => prev.map((d) => (selectedIds.has(d.id) ? { ...d, is_saved: true } : d)));
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkUnsaveSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setErrorMsg(null);
    setBulkBusy(true);
    try {
      const { error } = await supabase.from('companies').update({ is_saved: false }).in('id', ids);
      if (error) {
        console.error('bulk unsave error:', error);
        setErrorMsg(error.message || 'Failed to remove selected from Saved.');
        return;
      }

      setDeals((prev) => prev.map((d) => (selectedIds.has(d.id) ? { ...d, is_saved: false } : d)));
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const yes = window.confirm(`Delete ${ids.length} deal(s)? This removes them from your workspace and cannot be undone.`);
    if (!yes) return;

    setErrorMsg(null);
    setBulkBusy(true);
    try {
      const { error } = await supabase.from('companies').delete().in('id', ids);
      if (error) {
        console.error('bulk delete error:', error);
        setErrorMsg(error.message || 'Failed to delete selected deals.');
        return;
      }

      setDeals((prev) => prev.filter((d) => !selectedIds.has(d.id)));
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCimButtonClick = () => cimInputRef.current?.click();
  const handleFinancialsButtonClick = () => finInputRef.current?.click();

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
          owner_name: null,
          ai_summary: null,
          ai_confidence_json: null,
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

      const { data: storageData, error: storageError } = await supabase.storage.from('financials').upload(filePath, file);
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

        try {
          await supabase.storage.from('financials').remove([storedPath]);
        } catch (cleanupErr) {
          console.warn('Financials cleanup failed:', cleanupErr);
        }

        return;
      }

      const newId = insertData.id as string;

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
          owner_name: null,
          ai_summary: null,
          ai_confidence_json: null,
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

  // ✅ Tabs: keep Global but clearly “Coming soon”
  const tabs = useMemo(
    () =>
      [
        { key: 'saved' as const, label: 'Saved (Pipeline)' },
        { key: 'on_market' as const, label: 'On-market (Extension)' },
        { key: 'off_market' as const, label: 'Off-market (Targets)' },
        { key: 'cim_pdf' as const, label: 'CIM Uploads' },
        { key: 'financials' as const, label: 'Financial Uploads' },
        { key: 'on_market_global' as const, label: 'Global Feed (Coming soon)' },
      ] as const,
    []
  );

  const viewMeta = useMemo(() => {
    if (selectedView === 'saved')
      return {
        title: 'Saved (Pipeline)',
        subtitle: 'Your pipeline list. Tier = priority (not quality). Data confidence = completeness/quality of inputs.',
      };
    if (selectedView === 'on_market')
      return {
        title: 'On-market (Extension)',
        subtitle: 'Capture any listing with the Chrome extension to “own” it and run AI.',
      };
    if (selectedView === 'off_market')
      return {
        title: 'Off-market (Targets)',
        subtitle: 'Discovery results from your searches. Leads are not verified — you decide what to save.',
      };
    if (selectedView === 'cim_pdf')
      return {
        title: 'CIM Uploads',
        subtitle: 'Upload a CIM to generate memo + labels. Uploads don’t get a Tier.',
      };
    if (selectedView === 'financials')
      return {
        title: 'Financial Uploads',
        subtitle: 'Upload financials to run a skeptical quality analysis. Uploads don’t get a Tier.',
      };
    return {
      title: 'Global Feed',
      subtitle: 'Coming soon. We’re keeping this hidden during beta so users don’t rely on a half-built feed.',
    };
  }, [selectedView]);

  // Base list by view (companies table only)
  const baseDealsForView = useMemo(() => {
    if (selectedView === 'on_market_global') return [];

    return selectedView === 'saved'
      ? deals.filter((d) => d.is_saved === true)
      : deals.filter((deal) => {
          if (selectedView === 'cim_pdf') return deal.source_type === 'cim_pdf';
          if (selectedView === 'financials') return deal.source_type === 'financials';
          return deal.source_type === selectedView;
        });
  }, [deals, selectedView]);

  const filteredDeals = useMemo(() => {
    let list = [...baseDealsForView];

    if (tierControlsEnabled && tierFilter !== 'all') {
      list = list.filter((d) => {
        const tierApplicable = isTierApplicableSource(d.source_type);
        const t = (d.final_tier || '').toUpperCase();

        if (!tierApplicable && selectedView === 'saved') return true;

        if (tierFilter === 'unrated') {
          if (selectedView === 'saved') return !t || !tierApplicable;
          return !t;
        }

        return t === tierFilter;
      });
    }

    const effectiveSortKey: SortKey =
      !tierControlsEnabled && (sortKey === 'tier_high_to_low' || sortKey === 'tier_low_to_high') ? 'newest' : sortKey;

    list.sort((a, b) => {
      if (effectiveSortKey === 'newest' || effectiveSortKey === 'oldest') {
        const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
        return effectiveSortKey === 'newest' ? bd - ad : ad - bd;
      }

      if (effectiveSortKey === 'tier_high_to_low' || effectiveSortKey === 'tier_low_to_high') {
        const aTierApplicable = isTierApplicableSource(a.source_type);
        const bTierApplicable = isTierApplicableSource(b.source_type);

        const ar = aTierApplicable ? tierRank(a.final_tier) : 998;
        const br = bTierApplicable ? tierRank(b.final_tier) : 998;

        const primary = effectiveSortKey === 'tier_high_to_low' ? ar - br : br - ar;
        if (primary !== 0) return primary;

        const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bd - ad;
      }

      if (effectiveSortKey === 'company_az' || effectiveSortKey === 'company_za') {
        const an = normalizeName(a.company_name);
        const bn = normalizeName(b.company_name);
        const cmp = an.localeCompare(bn);
        return effectiveSortKey === 'company_az' ? cmp : -cmp;
      }

      return 0;
    });

    return list;
  }, [baseDealsForView, tierControlsEnabled, tierFilter, sortKey, selectedView]);

  // keep selections only for visible rows
  useEffect(() => {
    const visible = new Set(filteredDeals.map((d) => d.id));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
      });
      return next;
    });
  }, [filteredDeals]);

  const visibleIds = useMemo(() => filteredDeals.map((d) => d.id), [filteredDeals]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (allVisibleSelected) clearSelection();
    else selectAllVisible();
  };

  const BulkBar = () => {
    const disableAll = bulkBusy || loadingDeals || filteredDeals.length === 0;

    return (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
              }}
              onChange={toggleSelectAll}
              disabled={disableAll}
            />
            <span>{allVisibleSelected ? 'All selected' : 'Select all'}</span>
          </label>

          <button className="text-xs underline opacity-80" onClick={clearSelection} disabled={disableAll || selectedCount === 0}>
            Clear
          </button>

          <span className="opacity-70">{selectedCount} selected</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedView === 'saved' ? (
            <button className="btn-main" onClick={bulkUnsaveSelected} disabled={disableAll || selectedCount === 0}>
              {bulkBusy ? 'Working…' : 'Remove selected from Saved'}
            </button>
          ) : (
            <button className="btn-main" onClick={bulkSaveSelected} disabled={disableAll || selectedCount === 0}>
              {bulkBusy ? 'Working…' : 'Save selected'}
            </button>
          )}

          <button
            className="btn-main"
            onClick={bulkDeleteSelected}
            disabled={disableAll || selectedCount === 0}
            aria-disabled={disableAll || selectedCount === 0}
            title="Deletes deal records from your workspace (cannot be undone)."
          >
            {bulkBusy ? 'Working…' : 'Delete selected'}
          </button>
        </div>
      </div>
    );
  };

  const renderEmptyStateForView = () => {
    if (selectedView === 'saved') {
      return (
        <EmptyStateCard
          title="No saved deals yet"
          description="Capture deals via the extension or upload a CIM/financials, then save the ones you want in your pipeline."
          primaryLabel="Go to On-market (Extension)"
          onPrimary={() => changeView('on_market')}
          secondaryLabel="Upload a CIM"
          onSecondary={() => changeView('cim_pdf')}
        />
      );
    }

    if (selectedView === 'on_market') {
      return (
        <EmptyStateCard
          title="No on-market deals yet"
          description="Use the Chrome extension to capture live listings and send them here."
          primaryLabel="Connect Chrome extension"
          onPrimary={handleConnectExtension}
          secondaryLabel="Go to Saved"
          onSecondary={() => changeView('saved')}
        />
      );
    }

    if (selectedView === 'off_market') {
      return (
        <EmptyStateCard
          title="No off-market results yet"
          description="Search by industry + geography to surface owner-operated SMBs. Results are leads, not verified."
          primaryLabel="Run a search below"
          onPrimary={() => setOffSearchStatus(offSearchStatus ?? 'Add industries + city/state, then click Search.')}
          secondaryLabel="Go to Saved"
          onSecondary={() => changeView('saved')}
        />
      );
    }

    if (selectedView === 'financials') {
      return (
        <EmptyStateCard
          title="No financial uploads yet"
          description="Upload financials and run a skeptical quality analysis (red flags, green flags, missing items)."
          primaryLabel="Upload Financials"
          onPrimary={handleFinancialsButtonClick}
          secondaryLabel="Go to CIM Uploads"
          onSecondary={() => changeView('cim_pdf')}
        />
      );
    }

    return (
      <EmptyStateCard
        title="No CIM uploads yet"
        description="Upload a CIM to generate an AI investment memo."
        primaryLabel="Upload CIM (PDF)"
        onPrimary={handleCimButtonClick}
        secondaryLabel="Go to On-market (Extension)"
        onSecondary={() => changeView('on_market')}
      />
    );
  };

  const showTierColumn = selectedView === 'on_market' || selectedView === 'off_market' || selectedView === 'saved';

  if (checkingAuth) {
    return (
      <main className="py-12 text-center">
        <p className="text-sm">Checking your session…</p>
      </main>
    );
  }

  // ✅ Shared select styles (theme-aware)
  const selectCls =
    'w-full rounded-lg border px-3 py-2 text-sm appearance-none bg-transparent ' +
    'text-[color:var(--foreground)] border-black/20 dark:border-white/20 ' +
    'focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10';

  // ✅ If user clicks Global Feed: show ONLY Coming Soon page (no table, no controls)
  const renderGlobalComingSoon = () => (
    <ComingSoonPanel
      title="Global Feed"
      description="We’re building a real on-market feed — but we’re not shipping a half-done version. During private beta, SearchFindr is focused on analyzing deals you bring in."
      primaryLabel="Go to On-market (Extension)"
      onPrimary={() => changeView('on_market')}
      secondaryLabel="Upload a CIM"
      onSecondary={() => changeView('cim_pdf')}
    />
  );

  return (
    <main className="space-y-6 py-6 px-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Deals</h1>
          <p className="text-sm">Analyze deals faster. Tier = priority (not quality). Data confidence = completeness/quality of inputs.</p>
        </div>

        <div className="flex items-center gap-3">
          {email && (
            <span className="text-xs">
              Signed in as <span className="font-mono">{email}</span>
            </span>
          )}
          <ThemeToggle />
          <button onClick={() => window.open('/extension/callback', '_blank', 'noopener,noreferrer')} className="btn-main">
            Connect Chrome Extension
          </button>
          <button onClick={refreshDeals} className="btn-main" disabled={refreshing || loadingDeals || !workspaceId}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button onClick={handleLogout} className="btn-main">
            Log out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 pt-1 text-xs">
          {tabs.map((t) => {
            const isActive = selectedView === t.key;
            return (
              <button key={t.key} onClick={() => changeView(t.key)} className={`view-pill ${isActive ? 'view-pill--active' : ''}`}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* View header + view-scoped actions */}
        <section className="rounded-xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-sm font-semibold">{viewMeta.title}</h2>
              <p className="text-xs opacity-80">{viewMeta.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedView === 'cim_pdf' ? (
                <>
                  <button className="btn-main" onClick={handleCimButtonClick}>
                    Upload CIM (PDF)
                  </button>
                  <input ref={cimInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleCimFileChange} />
                </>
              ) : null}

              {selectedView === 'financials' ? (
                <>
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
                </>
              ) : null}
            </div>
          </div>

          {/* Upload status messages */}
          {selectedView === 'cim_pdf' && cimFile ? (
            <p className="mt-3 text-xs">
              CIM selected: <span className="font-medium">{cimFile.name}</span>{' '}
              {cimUploadStatus === 'uploading' && <span className="text-[11px] text-muted-foreground">(uploading…)</span>}
              {cimUploadStatus === 'uploaded' && <span className="text-[11px] text-green-600"> – uploaded & deal created</span>}
              {cimUploadStatus === 'error' && <span className="text-[11px] text-red-600"> – upload failed</span>}
            </p>
          ) : null}

          {selectedView === 'financials' && finFile ? (
            <p className="mt-3 text-xs">
              Financials selected: <span className="font-medium">{finFile.name}</span>{' '}
              {finUploadStatus === 'uploading' && <span className="text-[11px] text-muted-foreground">(uploading…)</span>}
              {finUploadStatus === 'uploaded' && <span className="text-[11px] text-green-600"> – uploaded & deal created</span>}
              {finUploadStatus === 'error' && <span className="text-[11px] text-red-600"> – upload failed</span>}
              {finUploadMsg ? <span className="text-[11px] opacity-80"> — {finUploadMsg}</span> : null}
            </p>
          ) : null}
        </section>
      </div>

      {/* ✅ Global feed = COMING SOON PAGE ONLY */}
      {selectedView === 'on_market_global' ? (
        renderGlobalComingSoon()
      ) : (
        // ✅ Companies table for all other views
        <section className="mt-4 card-table">
          <div className="mb-2 flex flex-col gap-2 px-4 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold">{selectedView === 'saved' ? 'Saved (Pipeline)' : 'Companies'}</h2>
              {loadingDeals ? (
                <p className="text-xs">Loading…</p>
              ) : (
                <p className="text-xs opacity-80">{filteredDeals.length === 0 ? 'No companies yet.' : `${filteredDeals.length} company(s) shown.`}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-80">Sort</span>
                <select
                  className="rounded-lg border px-3 py-2 bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 text-xs"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>

                  {tierControlsEnabled ? (
                    <>
                      <option value="tier_high_to_low">Tier (A → C)</option>
                      <option value="tier_low_to_high">Tier (C → A)</option>
                    </>
                  ) : null}

                  <option value="company_az">Company (A → Z)</option>
                  <option value="company_za">Company (Z → A)</option>
                </select>
              </div>

              {tierControlsEnabled ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-80">Tier</span>
                  <select
                    className="rounded-lg border px-3 py-2 bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 text-xs"
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value as TierFilter)}
                  >
                    <option value="all">All</option>
                    <option value="A">Tier A</option>
                    <option value="B">Tier B</option>
                    <option value="C">Tier C</option>
                    <option value="unrated">Unrated</option>
                  </select>
                </div>
              ) : null}

              <button
                className="text-xs underline opacity-80"
                onClick={() => {
                  setTierFilter('all');
                  setSortKey('newest');
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {errorMsg && <p className="px-4 pb-2 text-xs text-red-600">{errorMsg}</p>}

          {filteredDeals.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                    }}
                    onChange={() => {
                      if (allVisibleSelected) clearSelection();
                      else {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          visibleIds.forEach((id) => next.add(id));
                          return next;
                        });
                      }
                    }}
                    disabled={bulkBusy || loadingDeals || filteredDeals.length === 0}
                  />
                  <span>{allVisibleSelected ? 'All selected' : 'Select all'}</span>
                </label>

                <button
                  className="text-xs underline opacity-80"
                  onClick={clearSelection}
                  disabled={bulkBusy || loadingDeals || filteredDeals.length === 0 || selectedCount === 0}
                >
                  Clear
                </button>

                <span className="opacity-70">{selectedCount} selected</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedView === 'saved' ? (
                  <button className="btn-main" onClick={bulkUnsaveSelected} disabled={bulkBusy || selectedCount === 0}>
                    {bulkBusy ? 'Working…' : 'Remove selected from Saved'}
                  </button>
                ) : (
                  <button className="btn-main" onClick={bulkSaveSelected} disabled={bulkBusy || selectedCount === 0}>
                    {bulkBusy ? 'Working…' : 'Save selected'}
                  </button>
                )}

                <button
                  className="btn-main"
                  onClick={bulkDeleteSelected}
                  disabled={bulkBusy || selectedCount === 0}
                  aria-disabled={bulkBusy || selectedCount === 0}
                  title="Deletes deal records from your workspace (cannot be undone)."
                >
                  {bulkBusy ? 'Working…' : 'Delete selected'}
                </button>
              </div>
            </div>
          )}

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
                    <th className="px-2 py-1.5 font-medium w-[36px]"></th>
                    <th className="px-2 py-1.5 font-medium">Company</th>
                    {selectedView !== 'off_market' && <th className="px-2 py-1.5 font-medium">Source</th>}
                    {selectedView === 'on_market' && <th className="px-2 py-1.5 font-medium">Location</th>}
                    {selectedView === 'on_market' && <th className="px-2 py-1.5 font-medium">Industry</th>}
                    {showTierColumn && <th className="px-2 py-1.5 font-medium">Tier</th>}
                    <th className="px-2 py-1.5 font-medium">Data confidence</th>
                    <th className="px-2 py-1.5 font-medium">Why it matters</th>
                    <th className="px-2 py-1.5 font-medium">Created</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDeals.map((deal) => {
                    const conf = getDashboardConfidence(deal);
                    const why = getDashboardWhyItMatters(deal);
                    const tierApplicableRow = isTierApplicableSource(deal.source_type);

                    return (
                      <tr
                        key={deal.id}
                        className="table-row"
                        onClick={() => router.push(`/deals/${deal.id}?from_view=${selectedView}`)}
                        role="button"
                        tabIndex={0}
                      >
                        <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(deal.id)} onChange={() => toggleOne(deal.id)} />
                        </td>

                        <td className="px-2 py-2">
                          <div className="flex flex-col">
                            <Link href={`/deals/${deal.id}?from_view=${selectedView}`} className="underline" onClick={(e) => e.stopPropagation()}>
                              {deal.company_name || 'Untitled'}
                            </Link>
                          </div>
                        </td>

                        {selectedView !== 'off_market' && <td className="px-2 py-2">{formatSource(deal.source_type)}</td>}

                        {selectedView === 'on_market' && <td className="px-2 py-2">{formatLocation(deal.location_city, deal.location_state)}</td>}
                        {selectedView === 'on_market' && <td className="px-2 py-2">{deal.industry || ''}</td>}

                        {showTierColumn && <td className="px-2 py-2">{tierApplicableRow ? <TierPill tier={deal.final_tier} /> : null}</td>}

                        <td className="px-2 py-2">
                          <ConfidencePill icon={conf.icon} label={conf.label} title={conf.reason} level={conf.level} analyzed={conf.analyzed} />
                        </td>

                        <td className="px-2 py-2">
                          <span className="opacity-90">{why}</span>
                        </td>

                        <td className="px-2 py-2">{formatCreated(deal.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="pt-3 text-[11px] opacity-70">SearchFindr surfaces risk and prioritization signals. Final judgment remains with the buyer.</div>
            </div>
          )}
        </section>
      )}

      {/* Off-market search tool (UNCHANGED UI) */}
      {selectedView === 'off_market' && (
        <section className="card-table p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Off-market discovery</h2>
            <p className="text-xs opacity-80">Add industries + enter city/state + radius. Results appear in Off-market as leads. Tiers here are light surface signals.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs opacity-80">Industries</label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <select className={selectCls} value={offIndustryToAdd} onChange={(e) => setOffIndustryToAdd(e.target.value)}>
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
              <input className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm" value={offCity} onChange={(e) => setOffCity(e.target.value)} placeholder="e.g. Austin" />
            </div>

            <div className="space-y-1">
              <label className="text-xs opacity-80">State</label>
              <select className={selectCls} value={offState} onChange={(e) => setOffState(e.target.value)}>
                {US_STATES.map((s) => (
                  <option key={s.abbr} value={s.abbr}>
                    {s.abbr} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs opacity-80">Radius (miles)</label>
              <select className={selectCls} value={offRadiusMiles} onChange={(e) => setOffRadiusMiles(Number(e.target.value))}>
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
    </main>
  );
}
