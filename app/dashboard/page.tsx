// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';

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
  const [userId, setUserId] = useState<string | null>(null);

  const [loadingDeals, setLoadingDeals] = useState(true);
  const [deals, setDeals] = useState<Company[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [addingSample, setAddingSample] = useState(false);
  const [selectedView, setSelectedView] = useState<
    'all' | 'on_market' | 'off_market' | 'cim_pdf'
  >('all');

  useEffect(() => {
    const init = async () => {
      // 1) Check user auth
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

      // 2) Fetch this user's deals
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

  const handleAddSampleDeal = async () => {
    if (!userId) return;
    setAddingSample(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([
          {
            user_id: userId,
            company_name: 'Sample Electrical Contractor',
            location_city: 'Phoenix',
            location_state: 'AZ',
            industry: 'Commercial Electrical Services',
            source_type: 'on_market',
            score: 88,
            final_tier: 'A',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error(error);
        setErrorMsg('Failed to add sample deal.');
      } else if (data) {
        setDeals((prev) => [data as Company, ...prev]);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Unexpected error adding sample deal.');
    } finally {
      setAddingSample(false);
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
      <main className="py-12">
        <p className="text-sm text-slate-300">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="space-y-6 py-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Deals</h1>
          <p className="text-sm text-slate-400">
            On-market companies captured via the Chrome extension, plus CIMs and
            off-market opportunities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {email && (
            <span className="text-xs text-slate-400">
              Signed in as{' '}
              <span className="font-mono text-slate-200">{email}</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Top actions */}
      <div className="space-y-3">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button className="rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-slate-50 hover:bg-slate-700">
            Upload CIM (PDF)
          </button>
          <button className="rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-slate-50 hover:bg-slate-700">
            Add off-market company
          </button>
          <button
            onClick={handleAddSampleDeal}
            disabled={addingSample}
            className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {addingSample ? 'Adding sample…' : 'Add sample deal'}
          </button>
        </div>

        {/* View selector buttons */}
        <div className="flex flex-wrap gap-3 pt-2 text-xs">
          <button
            onClick={() => setSelectedView('all')}
            className={`rounded-md px-3 py-2 font-medium border ${
              selectedView === 'all'
                ? 'bg-slate-200 text-slate-900 border-slate-200'
                : 'bg-slate-900 text-slate-200 border-slate-700'
            }`}
          >
            All deals
          </button>
          <button
            onClick={() => setSelectedView('on_market')}
            className={`rounded-md px-3 py-2 font-medium border ${
              selectedView === 'on_market'
                ? 'bg-slate-200 text-slate-900 border-slate-200'
                : 'bg-slate-900 text-slate-200 border-slate-700'
            }`}
          >
            On-market deals
          </button>
          <button
            onClick={() => setSelectedView('off_market')}
            className={`rounded-md px-3 py-2 font-medium border ${
              selectedView === 'off_market'
                ? 'bg-slate-200 text-slate-900 border-slate-200'
                : 'bg-slate-900 text-slate-200 border-slate-700'
            }`}
          >
            Off-market deals
          </button>
          <button
            onClick={() => setSelectedView('cim_pdf')}
            className={`rounded-md px-3 py-2 font-medium border ${
              selectedView === 'cim_pdf'
                ? 'bg-slate-200 text-slate-900 border-slate-200'
                : 'bg-slate-900 text-slate-200 border-slate-700'
            }`}
          >
            CIMs (PDF)
          </button>
        </div>
      </div>

      {/* Deals table */}
      <section className="mt-4 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Saved companies</h2>
          {loadingDeals ? (
            <p className="text-xs text-slate-500">Loading deals…</p>
          ) : (
            <p className="text-xs text-slate-500">
              {filteredDeals.length === 0
                ? 'No deals yet.'
                : `${filteredDeals.length} deal(s) shown.`}
            </p>
          )}
        </div>

        {errorMsg && (
          <p className="mb-2 text-xs text-red-400">{errorMsg}</p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="px-2 py-1.5 font-medium">Company</th>
                <th className="px-2 py-1.5 font-medium">Location</th>
                <th className="px-2 py-1.5 font-medium">Industry</th>
                <th className="px-2 py-1.5 font-medium">Source</th>
                <th className="px-2 py-1.5 font-medium">Score</th>
                <th className="px-2 py-1.5 font-medium">Tier</th>
                <th className="px-2 py-1.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loadingDeals ? (
                <tr>
                  <td className="px-2 py-3 text-slate-400" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : filteredDeals.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-slate-400" colSpan={7}>
                    <span className="italic">
                      No deals yet. Once you analyze a listing with the Chrome extension
                      or add a CIM/off-market company, it’ll show up here.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    className="border-t border-slate-800 hover:bg-slate-900/70"
                  >
                    <td className="px-2 py-2 text-slate-200">
                      {deal.company_name || '—'}
                    </td>
                    <td className="px-2 py-2 text-slate-300">
                      {deal.location_city || deal.location_state
                        ? `${deal.location_city || ''}${
                            deal.location_city && deal.location_state ? ', ' : ''
                          }${deal.location_state || ''}`
                        : '—'}
                    </td>
                    <td className="px-2 py-2 text-slate-300">
                      {deal.industry || '—'}
                    </td>
                    <td className="px-2 py-2 text-slate-300">
                      {deal.source_type || '—'}
                    </td>
                    <td className="px-2 py-2 text-slate-300">
                      {deal.score ?? '—'}
                    </td>
                    <td className="px-2 py-2 text-slate-300">
                      {deal.final_tier || '—'}
                    </td>
                    <td className="px-2 py-2 text-slate-400">
                      {deal.created_at
                        ? new Date(deal.created_at).toLocaleDateString()
                        : '—'}
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
