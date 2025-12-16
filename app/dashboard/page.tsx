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
  score: number | null; // kept in type, but no longer displayed
  final_tier: string | null;
  created_at: string | null;
  listing_url: string | null;
  // planning ahead for off-market:
  owner_name?: string | null;
};

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
function getColSpanForView(
  view: 'all' | 'on_market' | 'off_market' | 'cim_pdf'
) {
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
    case 'all':
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
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const [loadingDeals, setLoadingDeals] = useState(true);
  const [deals, setDeals] = useState<Company[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedView, setSelectedView] = useState<
    'all' | 'on_market' | 'off_market' | 'cim_pdf'
  >('all');

  // CIM upload state
  const [cimFile, setCimFile] = useState<File | null>(null);
  const cimInputRef = useRef<HTMLInputElement | null>(null);
  const [cimUploadStatus, setCimUploadStatus] = useState<
    'idle' | 'uploading' | 'uploaded' | 'error'
  >('idle');

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
          created_at
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

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error:', error);
    setErrorMsg(error.message || 'Failed to delete deal.');
    return;
  }

  setDeals((prev) => prev.filter((d) => d.id !== id));
};

  const filteredDeals =
    selectedView === 'all'
      ? deals
      : deals.filter((deal) => {
          if (selectedView === 'cim_pdf') {
            return deal.source_type === 'cim_pdf';
          }
          return deal.source_type === selectedView;
        });

  const handleCimButtonClick = () => {
    cimInputRef.current?.click();
  };

  // upload + create companies row
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
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;
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
          // if you added this column:
          cim_storage_path: storageData?.path || filePath,
          user_id: userId,
        })
        .select('id')
        .single();

      if (insertError || !insertData) {
        console.error('Error inserting CIM company row:', insertError);
        setErrorMsg('CIM uploaded, but failed to create deal record.');
        return;
      }

      const newId = insertData.id as string;

      // Update local state so it shows up in the table without reload
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
            On-market companies captured via the Chrome extension, plus CIMs and
            off-market opportunities.
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

          <button className="btn-main">Add off-market company</button>

          <a
            href="https://qcqhmoshjlxiuhgwpfca.supabase.co/storage/v1/object/public/extensions/searchfindr-extension-uncle.zip"
            className="btn-main"
          >
            Download Chrome extension
          </a>
        </div>

        {cimFile && (
          <p className="text-xs">
            CIM selected: <span className="font-medium">{cimFile.name}</span>{' '}
            {cimUploadStatus === 'uploading' && (
              <span className="text-[11px] text-muted-foreground">
                (uploading…)
              </span>
            )}
            {cimUploadStatus === 'uploaded' && (
              <span className="text-[11px] text-green-600">
                {' '}
                – uploaded & deal created
              </span>
            )}
            {cimUploadStatus === 'error' && (
              <span className="text-[11px] text-red-600">
                {' '}
                – upload failed
              </span>
            )}
          </p>
        )}

        {/* View selector buttons */}
        <div className="flex flex-wrap gap-3 pt-2 text-xs">
          {(['all', 'on_market', 'off_market', 'cim_pdf'] as const).map(
            (view) => {
              const isActive = selectedView === view;
              const label =
                view === 'all'
                  ? 'All deals'
                  : view === 'on_market'
                  ? 'On-market deals'
                  : view === 'off_market'
                  ? 'Off-market deals'
                  : 'CIMs (PDF)';

              return (
                <button
                  key={view}
                  onClick={() => setSelectedView(view)}
                  className={`view-pill ${
                    isActive ? 'view-pill--active' : ''
                  }`}
                >
                  {label}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Deals table */}
      <section className="mt-4 card-table">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Saved companies</h2>
          {loadingDeals ? (
            <p className="text-xs">Loading deals…</p>
          ) : (
            <p className="text-xs">
              {filteredDeals.length === 0
                ? 'No deals yet.'
                : `${filteredDeals.length} deal(s) shown.`}
            </p>
          )}
        </div>

        {errorMsg && (
          <p className="mb-2 text-xs text-red-600">{errorMsg}</p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="table-header">
              <tr>
                {/* ALL DEALS: Company / Source / Created / Actions */}
                {selectedView === 'all' && (
                  <>
                    <th className="px-2 py-1.5 font-medium">Company</th>
                    <th className="px-2 py-1.5 font-medium">Source</th>
                    <th className="px-2 py-1.5 font-medium">Created</th>
                    <th className="px-2 py-1.5 font-medium text-right"></th>
                  </>
                )}

                {/* ON-MARKET: Company / Location / Industry / Tier / Created / Actions */}
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

                {/* OFF-MARKET: Company / Owner / Created / Actions */}
                {selectedView === 'off_market' && (
                  <>
                    <th className="px-2 py-1.5 font-medium">Company</th>
                    <th className="px-2 py-1.5 font-medium">Owner</th>
                    <th className="px-2 py-1.5 font-medium">Created</th>
                    <th className="px-2 py-1.5 font-medium text-right"></th>
                  </>
                )}

                {/* CIMs: Company / Tier / Created / Actions */}
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
                  <td
                    className="px-2 py-3"
                    colSpan={getColSpanForView(selectedView)}
                  >
                    Loading…
                  </td>
                </tr>
              ) : filteredDeals.length === 0 ? (
                <tr>
                  <td
                    className="px-2 py-3 italic"
                    colSpan={getColSpanForView(selectedView)}
                  >
                    No deals yet. Once you analyze a listing with the Chrome
                    extension or add a CIM/off-market company, it’ll show up
                    here.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr key={deal.id} className="table-row">
                    {/* ALL DEALS ROW */}
                    {selectedView === 'all' && (
                      <>
                        <td className="px-2 py-2">
                          <Link
                            href={`/deals/${deal.id}`}
                            className="underline"
                          >
                            {deal.company_name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-2 py-2">
                          {formatSource(deal.source_type)}
                        </td>
                        <td className="px-2 py-2">
                          {deal.created_at
                            ? new Date(
                                deal.created_at
                              ).toLocaleDateString()
                            : ''}
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

                    {/* ON-MARKET ROW */}
                    {selectedView === 'on_market' && (
                      <>
                        <td className="px-2 py-2">
                          <Link
                            href={`/deals/${deal.id}`}
                            className="underline"
                          >
                            {deal.company_name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-2 py-2">
                          {formatLocation(
                            deal.location_city,
                            deal.location_state
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {deal.industry || ''}
                        </td>
                        <td className="px-2 py-2">
                          <TierPill tier={deal.final_tier} />
                        </td>
                        <td className="px-2 py-2">
                          {deal.created_at
                            ? new Date(
                                deal.created_at
                              ).toLocaleDateString()
                            : ''}
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

                    {/* OFF-MARKET ROW */}
                    {selectedView === 'off_market' && (
                      <>
                        <td className="px-2 py-2">
                          <Link
                            href={`/deals/${deal.id}`}
                            className="underline"
                          >
                            {deal.company_name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-2 py-2">
                          {deal.owner_name || ''}
                        </td>
                        <td className="px-2 py-2">
                          {deal.created_at
                            ? new Date(
                                deal.created_at
                              ).toLocaleDateString()
                            : ''}
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

                    {/* CIM ROW */}
                    {selectedView === 'cim_pdf' && (
                      <>
                        <td className="px-2 py-2">
                          <Link
                            href={`/deals/${deal.id}`}
                            className="underline"
                          >
                            {deal.company_name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-2 py-2">
                          <TierPill tier={deal.final_tier} />
                        </td>
                        <td className="px-2 py-2">
                          {deal.created_at
                            ? new Date(
                                deal.created_at
                              ).toLocaleDateString()
                            : ''}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
