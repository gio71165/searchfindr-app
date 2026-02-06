'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Flag,
  Trophy,
  Send,
  RefreshCw,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface CoalitionDashboardData {
  driftDetector: { searcherId: string; workspaceId: string; displayName: string; daysSinceLastStageMove: number }[];
  cohortBenchmark: {
    coalitionAvgDaysCimToLoi: number;
    searcherOptions: { searcherId: string; workspaceId: string; displayName: string }[];
    searcherAvgDaysCimToLoi: Record<string, number>;
  };
  marketHeatmap: { industry: string; count: number }[];
  redFlagAggregate: { flag: string; count: number }[];
  leaderboard: { rank: number; label: string; workspaceId: string; dealFlowThisMonth: number; anonymized: boolean }[];
  reviewingWorkspaceIds: string[];
}

export default function CoalitionDashboardPage() {
  const [data, setData] = useState<CoalitionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }
      const res = await fetch('/api/coalition/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load (${res.status})`);
      }
      const json = await res.json();
      setData(json);
      if (json.cohortBenchmark?.searcherOptions?.length && !selectedWorkspaceId) {
        setSelectedWorkspaceId(json.cohortBenchmark.searcherOptions[0]?.workspaceId ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspaceId]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleBroadcast = async () => {
    setBroadcasting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Not authenticated', 'error');
        return;
      }
      const res = await fetch('/api/coalition/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: 'Consider moving deals forward — your pipeline is waiting!',
          target_stage: 'reviewing',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(json.error || 'Failed to send nudge', 'error');
        return;
      }
      showToast(json.message || `Nudge sent to ${json.recipientCount || 0} searcher(s).`, 'success');
      loadDashboard();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to send', 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-6 text-center">
          <p className="text-red-300 mb-4">{error}</p>
          <button onClick={loadDashboard} className="btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const d = data!;
  const selectedSearcherAvg = selectedWorkspaceId
    ? d.cohortBenchmark.searcherAvgDaysCimToLoi[selectedWorkspaceId] ?? 0
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Command Center</h1>
          <p className="text-slate-400 text-sm mt-1">Coalition-wide intelligence and nudges</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-600 hover:bg-slate-700 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleBroadcast}
            disabled={broadcasting || d.reviewingWorkspaceIds.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg border border-emerald-500 hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            {broadcasting ? 'Sending…' : `Broadcast Nudge (${d.reviewingWorkspaceIds.length} in Reviewing)`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Drift Detector */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-slate-50">The Drift Detector</h2>
          </div>
          <p className="text-xs text-amber-200/80 mb-4">High risk of searcher burnout</p>
          {d.driftDetector.length === 0 ? (
            <p className="text-slate-400 text-sm">No searchers have been idle 14+ days.</p>
          ) : (
            <ul className="space-y-2">
              {d.driftDetector.map((s) => (
                <li
                  key={s.workspaceId}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/80 border border-slate-600"
                >
                  <span className="text-slate-200 font-medium truncate">{s.displayName}</span>
                  <span className="text-amber-400 text-sm font-mono">{s.daysSinceLastStageMove}d no move</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cohort Benchmarking */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-50">Cohort Benchmarking</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">Avg. days from CIM to LOI</p>
          <div className="flex flex-wrap gap-4 items-end mb-4">
            <div className="bg-slate-800/80 rounded-lg border border-slate-600 px-4 py-3 min-w-[140px]">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Coalition avg</div>
              <div className="text-2xl font-bold text-blue-300">{d.cohortBenchmark.coalitionAvgDaysCimToLoi} days</div>
            </div>
            {d.cohortBenchmark.searcherOptions.length > 0 && (
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-slate-400 mb-1">Compare to searcher</label>
                <select
                  value={selectedWorkspaceId ?? ''}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value || null)}
                  className="w-full max-w-xs px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm"
                >
                  {d.cohortBenchmark.searcherOptions.map((opt) => (
                    <option key={opt.workspaceId} value={opt.workspaceId}>
                      {opt.displayName}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-lg font-semibold text-emerald-300">
                  {selectedSearcherAvg} days
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Market Heatmap */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-50">Market Heatmap</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">Top industries in Due Diligence</p>
          {d.marketHeatmap.length === 0 ? (
            <p className="text-slate-400 text-sm">No deals in DD yet.</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.marketHeatmap} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis type="category" dataKey="industry" stroke="#64748b" fontSize={11} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name="Deals" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Red Flag Aggregate */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flag className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-slate-50">Red Flag Aggregate</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">Most common red flags in CIMs this week</p>
          {d.redFlagAggregate.length === 0 ? (
            <p className="text-slate-400 text-sm">No red-flag data this week.</p>
          ) : (
            <ul className="space-y-2">
              {d.redFlagAggregate.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/80 border border-slate-600"
                >
                  <span className="text-slate-200 text-sm truncate flex-1 mr-2">{r.flag}</span>
                  <span className="text-red-400 text-sm font-mono">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-slate-50">Leaderboard</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">Deal flow volume this month (anonymized where applicable)</p>
        {d.leaderboard.length === 0 ? (
          <p className="text-slate-400 text-sm">No activity this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600 text-slate-400 text-left">
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Searcher</th>
                  <th className="py-2 text-right">Deal flow (month)</th>
                </tr>
              </thead>
              <tbody>
                {d.leaderboard.map((row) => (
                  <tr key={row.workspaceId} className="border-b border-slate-700/80">
                    <td className="py-3 pr-4 font-mono text-slate-300">{row.rank}</td>
                    <td className="py-3 pr-4 text-slate-200">
                      {row.anonymized ? `Searcher #${row.rank}` : row.label}
                    </td>
                    <td className="py-3 text-right font-semibold text-emerald-300">{row.dealFlowThisMonth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
