// app/dashboard/page.tsx
'use client';

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  score: number | null; // kept in type, but no longer displayed
  final_tier: string | null;
  created_at: string | null;
  listing_url: string | null;
  is_saved: boolean | null;
  // planning ahead for off-market:
  owner_name?: string | null;
};

type DashboardView = 'saved' | 'on_market' | 'off_market' | 'cim_pdf';
const DEFAULT_VIEW: DashboardView = 'saved';

function isDashboardView(v: any): v is DashboardView {
  return v === 'saved' || v === 'on_market' || v === 'off_market' || v === 'cim_pdf';
}

// helper: nicer source label
function formatSource(source: string | null): string {
  if (!source) return '';
  if (source === 'on_market') return 'On-market';
  if (source === 'off_market') return 'Off-market';
  if (source === 'cim_pdf') return 'CIM (PDF)';
  return source;
}

// helper: location formatter without '—'
function formatLocation(city: string | null, state: string | null): string {
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return '';
}

// helper: colSpan per view
function getColSpanForView(view: DashboardView) {
  switch (view) {
    case 'on_market':
      // Company, Location, Industry, Tier, Created, Actions
      return 6;
    case 'off_market':
      // Company, Owner, Created, Actions
      return 4;
    case 'cim_pdf':
      // Company, Tier, Created, Actions
      return 4;
    case 'saved':
    default:
      // Company, Source, Created, Actions
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

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const [loadingDeals, setLoadingDeals] = useState(true);
  const [deals, setDeals] = useState<Company[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // ✅ View state
  const [selectedView, setSelectedView] = useState<DashboardView>(DEFAULT_VIEW);

  // ✅ On first mount: pick view from URL ?view=... then localStorage, else default.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlView = searchParams?.get('view');
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
  }, []); // intentionally only once

  // ✅ Change view: update state + localStorage + URL
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
  const [cimUploadStatus, setCimUploadStatus] = useState<
    'idle' | 'uploading' | 'uploaded' | 'error'
  >('idle');

  // Off-market search state (V1 minimal)
  const [offIndustry, setOffIndustry] = useState('');
  const [offLocation, setOffLocation] = useState('');
  const [offRadiusMiles, setOffRadiusMiles] = useState<number>(10);
  const [offSearching, setOffSearching] = useState(false);
  const [offSearchStatus, setOffSearchStatus] = useState<string | null>(null);

  // ✅ helper: refresh deals (used by refresh button + off-market search)
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

        // IMPORTANT: never get stuck on "Checking your session…"
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

  // ✅ hard delete (still allowed in non-saved tabs)
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

  // ✅ save toggle
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

  // ✅ remove from saved (NOT delete)
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
          return deal.source_type === selectedView;
        });

  const handleCimButtonClick = () => {
    cimInputRef.current?.click();
  };

  // Off-market search: industry + location + radius → API → save → refresh
  const handleOffMarketSearch = async () => {
    setErrorMsg(null);
    setOffSearchStatus(null);

    const industry = offIndustry.trim();
    const location = offLocation.trim();
    const radius = Number(offRadiusMiles);

    if (!industry || !location || !Number.isFinite(radius) || radius <= 0) {
      setOffSearchStatus('Please enter industry, location, and a radius > 0.');
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
          industry,
          location,
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

  // upload + create companies row (not saved by default)
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

      // 1) Upload to Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('cims')
        .upload(filePath, file);

      if (storageError) {
        console.error('CIM upload error:', storageError);
        setErrorMsg('Failed to upload CIM. Please try again.');
        setCimUploadStatus('error');
        return;
      }

      setCimUploadStatus('uploaded');

      // 2) Create a new company row with source_type = 'cim_pdf'
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

  const handleConnectExtension = () => {
    // send them to the callback page that verifies login + provides token flow
    window.location.href = 'https://searchfindr-app.vercel.app/extension/callback';
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
      {/* Header / Nav */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Deals</h1>
          <p className="text-sm">
            Search + early diligence workspace. Nothing is “Saved” unless you explicitly save it.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {email && (
            <span className="text-xs">
              Signed in as <span className="font-mono">{email}</span>
            </span>
          )}

          <ThemeToggle />

          <button onClick={handleLogout} className="btn-main">
            Log out
          </button>
        </div>
      </header>

      {/* Top actions */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <button className="btn-main" onClick={handleCimButtonClick}>
            Upload CIM (PDF)
          </button>

          <input
            ref={cimInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleCimFileChange}
          />

          {/* ✅ new */}
          <button className="btn-main" onClick={handleConnectExtension}>
            Connect to Chrome extension
          </button>

          {/* ✅ new */}
          <button className="btn-main" onClick={refreshDeals} disabled={refreshing || loadingDeals || !workspaceId}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {cimFile && (
          <p className="text-xs">
            CIM selected: <span className="font-medium">{cimFile.name}</span>{' '}
            {cimUploadStatus === 'uploading' && (
              <span className="text-[11px] text-muted-foreground">(uploading…)</span>
            )}
            {cimUploadStatus === 'uploaded' && (
              <span className="text-[11px] text-green-600"> – uploaded & deal created</span>
            )}
            {cimUploadStatus === 'error' && (
              <span className="text-[11px] text-red-600"> – upload failed</span>
            )}
          </p>
        )}

        {/* View selector buttons */}
        <div className="flex flex-wrap gap-3 pt-2 text-xs">
          {(['saved', 'on_market', 'off_market', 'cim_pdf'] as const).map((view) => {
            const isActive = selectedView === view;
            const label =
              view === 'saved'
                ? 'Saved Companies'
                : view === 'on_market'
                ? 'On-market'
                : view === 'off_market'
                ? 'Off-market'
                : 'CIMs';

            return (
              <button
                key={view}
                onClick={() => changeView(view)}
                className={`view-pill ${isActive ? 'view-pill--active' : ''}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {refreshing && (
          <p className="text-[11px] opacity-70">Refreshing deals…</p>
        )}
      </div>

      {/* Off-market search panel (only when Off-market tab is selected) */}
      {selectedView === 'off_market' && (
        <section className="card-table p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Off-market discovery</h2>
            <p className="text-xs opacity-80">
              Search by industry + location + radius. Results appear in Off-market, then you decide what to save.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs opacity-80">Industry</label>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm"
                value={offIndustry}
                onChange={(e) => setOffIndustry(e.target.value)}
                placeholder="e.g. HVAC, Plumbing, Commercial Cleaning"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs opacity-80">Location</label>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm"
                value={offLocation}
                onChange={(e) => setOffLocation(e.target.value)}
                placeholder='e.g. "Austin, TX"'
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs opacity-80">Radius (miles)</label>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm"
                type="number"
                min={1}
                max={50}
                value={offRadiusMiles}
                onChange={(e) => setOffRadiusMiles(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-main" onClick={handleOffMarketSearch} disabled={offSearching}>
              {offSearching ? 'Searching…' : 'Search'}
            </button>

            {offSearchStatus && <span className="text-xs opacity-80">{offSearchStatus}</span>}
          </div>
        </section>
      )}

      {/* Deals table */}
      <section className="mt-4 card-table">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {selectedView === 'saved' ? 'Saved companies' : 'Companies'}
          </h2>
          {loadingDeals ? (
            <p className="text-xs">Loading…</p>
          ) : (
            <p className="text-xs">
              {filteredDeals.length === 0 ? 'No companies yet.' : `${filteredDeals.length} company(s) shown.`}
            </p>
          )}
        </div>

        {errorMsg && <p className="mb-2 text-xs text-red-600">{errorMsg}</p>}

        <div className="overflow-x-auto">
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
              </tr>
            </thead>

            <tbody>
              {loadingDeals ? (
                <tr>
                  <td className="px-2 py-3" colSpan={getColSpanForView(selectedView)}>
                    Loading…
                  </td>
                </tr>
              ) : filteredDeals.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 italic" colSpan={getColSpanForView(selectedView)}>
                    {selectedView === 'saved'
                      ? 'No saved companies yet. Save from On-market, Off-market, or CIMs.'
                      : 'No companies yet.'}
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr key={deal.id} className="table-row">
                    {/* SAVED ROW */}
                    {selectedView === 'saved' && (
                      <>
                        <td className="px-2 py-2">
                          <Link href={`/deals/${deal.id}?from_view=${selectedView}`} className="underline">
                            {deal.company_name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-2 py-2">{formatSource(deal.source_type)}</td>
                        <td className="px-2 py-2">
                          {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : ''}
                        </td>
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

                    {/* ON-MARKET ROW */}
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
                        <td className="px-2 py-2">
                          {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : ''}
                        </td>
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

                    {/* OFF-MARKET ROW */}
                    {selectedView === 'off_market' && (
                      <>
                        <td className="px-2 py-2">
                          <Link href={`/deals/${deal.id}?from_view=${selectedView}`} className="underline">
                            {deal.company_name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-2 py-2">{deal.owner_name || ''}</td>
                        <td className="px-2 py-2">
                          {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : ''}
                        </td>
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

                    {/* CIM ROW */}
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
                        <td className="px-2 py-2">
                          {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : ''}
                        </td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
