'use client';

import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { ExecutiveSummaryCard } from '../components/ExecutiveSummaryCard';
import { DealChatPanel } from '../components/DealChatPanel';
import { AIInvestmentMemo } from '../components/AIInvestmentMemo';
import { FinancialSnapshot } from '../components/FinancialSnapshot';
import { RiskSignalsCard } from '../components/RiskSignalsCard';
import { SearcherSnapshot } from '../components/SearcherSnapshot';
import { RedFlagsPanel } from '../components/RedFlagsPanel';
import { QoeRedFlagsPanel } from '../components/QoeRedFlagsPanel';
import { StrengthsPanel } from '../components/StrengthsPanel';
import { OwnerInterviewQuestions } from '../components/OwnerInterviewQuestions';
import { BackButton } from '../components/BackButton';
import { normalizeRedFlags } from '../lib/normalizers';
import type { Deal } from '@/lib/types/deal';
import { TrendingUp, BarChart3, User, CheckCircle2 } from 'lucide-react';

export function OffMarketDealView({
  deal,
  dealId,
  onBack,
  running,
  error,
  onRunInitialDiligence,
  canToggleSave,
  savingToggle,
  onToggleSave,
}: {
  deal: Deal;
  dealId: string;
  onBack: () => void;
  running: boolean;
  error: string | null;
  onRunInitialDiligence: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
}) {
  const fin = deal.ai_financials_json || {};
  const scoring = deal.ai_scoring_json || {};
  const criteria = deal.criteria_match_json || {};
  const criteriaAny = criteria as Record<string, unknown> | null;
  const ownerSignals = criteriaAny?.owner_signals as {
    likely_owner_operated?: boolean;
    owner_named_on_site?: boolean;
    owner_name?: string;
    generation_hint?: string;
    owner_dependency_risk?: string;
    years_in_business?: string;
    evidence?: string[];
    missing_info?: string[];
    confidence?: number;
  } | null || null;
  const redFlags = normalizeRedFlags(deal.ai_red_flags);
  const qoeRedFlags = fin.qoe_red_flags || [];
  const ownerQuestions = fin.owner_interview_questions || [];

  const dealWithExtras = deal as Deal & {
    rating?: number | null;
    ratings_total?: number | null;
  };
  const ratingLine =
    dealWithExtras.rating || dealWithExtras.ratings_total ? `${dealWithExtras.rating ?? '—'} (${dealWithExtras.ratings_total ?? '—'} reviews)` : null;

  const confidencePct =
    ownerSignals && typeof ownerSignals.confidence === 'number' ? Math.round(ownerSignals.confidence * 100) : null;

  const [passing, setPassing] = useState(false);

  const handlePass = async () => {
    if (passing) return;
    
    const confirmed = window.confirm('Mark this deal as passed? This will hide it from your dashboard.');
    if (!confirmed) return;

    setPassing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch(`/api/deals/${dealId}/pass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to pass deal');
      }

      window.location.href = '/dashboard';
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      alert(`Failed to pass deal: ${error.message}`);
    } finally {
      setPassing(false);
    }
  };

  const handleRequestInfo = () => {
    alert('Coming soon');
  };

  return (
    <main className="min-h-screen bg-[#F9FAFB] dark:bg-slate-900">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <BackButton dealSourceType={deal.source_type} />
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 pr-6 space-y-8">
            {/* Executive Summary Card */}
            <ExecutiveSummaryCard
              deal={deal}
              onSave={onToggleSave}
              onPass={handlePass}
              onRequestInfo={handleRequestInfo}
              savingToggle={savingToggle}
              canToggleSave={canToggleSave}
              passing={passing}
            />

            {ratingLine && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                <span className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-1 text-xs text-slate-700 dark:text-slate-300">
                  Google {ratingLine}
                </span>
              </div>
            )}

            {/* Initial Diligence Run Strip */}
            <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Initial Diligence</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Runs AI based on the company's website + available inputs.</p>
                </div>
                <button
                  onClick={onRunInitialDiligence}
                  disabled={running}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  {running ? 'Running…' : deal.ai_summary ? 'Re-run' : 'Run'}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </section>

            {/* QoE Red Flags - Before regular red flags */}
            <QoeRedFlagsPanel qoeRedFlags={qoeRedFlags} />

            {/* Red Flags */}
            <RedFlagsPanel redFlags={redFlags} />

            {/* Strengths */}
            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500 dark:border-l-green-600 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Strengths</h3>
              </div>
              <StrengthsPanel deal={deal} />
            </div>

            {/* AI Investment Memo */}
            <AIInvestmentMemo
              summary={deal.ai_summary}
              emptyText="No diligence memo yet. Run Initial Diligence to generate one from the company website."
            />

            {/* Owner Signals */}
            {ownerSignals && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Owner Signals (Probabilistic)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">Likely owner-operated</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {ownerSignals.likely_owner_operated ? 'Yes' : 'No'}
                      {confidencePct !== null && <span className="text-xs text-slate-600 dark:text-slate-400"> ({confidencePct}%)</span>}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">Owner named on site</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {ownerSignals.owner_named_on_site ? 'Yes' : 'No'}
                      {ownerSignals.owner_named_on_site && ownerSignals.owner_name && (
                        <span className="text-xs text-slate-600 dark:text-slate-400"> — {ownerSignals.owner_name}</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">Generation hint</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{ownerSignals.generation_hint || 'unknown'}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">Key-person dependency risk</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{ownerSignals.owner_dependency_risk || 'Unknown'}</p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">Years in business</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{ownerSignals.years_in_business || 'Unknown'}</p>
                  </div>
                </div>

                {Array.isArray(ownerSignals.evidence) && ownerSignals.evidence.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-2">Evidence</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      {ownerSignals.evidence.slice(0, 6).map((e: string, idx: number) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(ownerSignals.missing_info) && ownerSignals.missing_info.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-2">Missing info</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      {ownerSignals.missing_info.slice(0, 6).map((m: string, idx: number) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Financial Details */}
            <FinancialSnapshot fin={fin} deal={deal} />

            {/* Owner Interview Questions */}
            <OwnerInterviewQuestions questions={ownerQuestions} />

            {/* Scoring Breakdown */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Scoring Breakdown</h3>
              </div>
              <RiskSignalsCard
                scoring={scoring}
                title=""
                subtitle="Prioritization view (not a recommendation). Risk signals: High = more risk. Fit/quality signals: High = stronger alignment/quality."
              />
            </div>

            {/* Searcher Fit Analysis */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Searcher Fit Analysis</h3>
              </div>
              <SearcherSnapshot criteria={criteria} />
            </div>
          </div>

          {/* Chat Sidebar */}
          <DealChatPanel dealId={dealId} deal={deal} />
        </div>
      </div>
    </main>
  );
}
