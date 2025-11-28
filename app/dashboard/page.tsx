// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
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
};

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const [loadingDeals, setLoadingDeals] = useState(true);
  const [deals, setDeals] = useState<Company[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedView, setSelectedView] = useState<
    'all' | 'on_market' | 'off_market' | 'cim_pdf'
  >('all');

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/');
        return;
      }

      setEmail(user.email ?? null);
      setCheckingAuth(false);

      setLoadingDeals(true);
      setErrorMsg(null);

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
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setErrorMsg('Failed to load deals.');
      } else if (data) {
        setDeals(data as Company[]);
      }

      setLoadingDeals(false);
    };

    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  // delete handler
  const handleDelete = async (id: string) => {
    const yes = window.confirm('Delete this deal? This cannot be undone.');

    if (!yes) return;

    setErrorMsg(null);

    try {
      const res = await fetch('/api/delete-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error('Delete error:', json);
        setErrorMsg(json.error || 'Failed to delete deal.');
        return;
      }

      // Remove from local state so UI updates instantly
      setDeals((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
      setErrorMsg('Unexpected error deleting deal.');
    }
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
        <div className="flex flex-wrap gap-3">
          <button className="btn-main">Upload CIM (PDF)</button>
          <button className="btn-main">Add off-market company</button>

          {/* Download Chrome Extension button */}
          <a
            href="https://qcqhmoshjlxiuhgwpfca.supabase.co/storage/v1/object/public/extensions/searchfindr-extension-uncle%20(2).zip"
            download="SearchFindr-Chrome-Extension.zip"
            className="btn-main"
          >
            Download Chrome extension
          </a>
        </div>

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
                  className={`view-pill ${isActive ? 'view-pill--active' : ''}`}
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
                <th className="px-2 py-1.5 font-medium">Company</th>
                <th className="px-2 py-1.5 font-medium">Location</th>
                <th className="px-2 py-1.5 font-medium">Industry</th>
                <th className="px-2 py-1.5 font-medium">Source</th>
                <th className="px-2 py-1.5 font-medium">Score</th>
                <th className="px-2 py-1.5 font-medium">Tier</th>
                <th className="px-2 py-1.5 font-medium">Created</th>
                <th className="px-2 py-1.5 font-medium text-right">
                  {/* actions */}
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingDeals ? (
                <tr>
                  <td className="px-2 py-3" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              ) : filteredDeals.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 italic" colSpan={8}>
                    No deals yet. Once you analyze a listing with the Chrome
                    extension or add a CIM/off-market company, it’ll show up
                    here.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    className="table-row cursor-pointer"
                  >
                    <td className="px-2 py-2">
                      <Link href={`/deals/${deal.id}`} className="underline">
                        {deal.company_name || '—'}
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      {deal.location_city || deal.location_state
                        ? `${deal.location_city || ''}${
                            deal.location_city && deal.location_state ? ', ' : ''
                          }${deal.location_state || ''}`
                        : '—'}
                    </td>
                    <td className="px-2 py-2">
                      {deal.industry || '—'}
                    </td>
                    <td className="px-2 py-2">
                      {deal.source_type || '—'}
                    </td>
                    <td className="px-2 py-2">
                      {deal.score ?? '—'}
                    </td>
                    <td className="px-2 py-2">
                      {deal.final_tier || '—'}
                    </td>
                    <td className="px-2 py-2">
                      {deal.created_at
                        ? new Date(deal.created_at).toLocaleDateString()
                        : '—'}
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
