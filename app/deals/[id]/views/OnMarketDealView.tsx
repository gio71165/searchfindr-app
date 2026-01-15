'use client';

import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { ExecutiveSummaryCard } from '../components/ExecutiveSummaryCard';
import { DealChatPanel } from '../components/DealChatPanel';
import { AIInvestmentMemo } from '../components/AIInvestmentMemo';
import { FinancialSnapshot } from '../components/FinancialSnapshot';
import { RiskSignalsCard } from '../components/RiskSignalsCard';
import { RedFlagsPanel } from '../components/RedFlagsPanel';
import { QoeRedFlagsPanel } from '../components/QoeRedFlagsPanel';
import { StrengthsPanel } from '../components/StrengthsPanel';
import { OwnerInterviewQuestions } from '../components/OwnerInterviewQuestions';
import { SearcherSnapshot } from '../components/SearcherSnapshot';
import { DealStructureCalculator } from '../components/DealStructureCalculator';
import { BackButton } from '../components/BackButton';
import { normalizeRedFlags } from '../lib/normalizers';
import type { Deal } from '@/lib/types/deal';
import { TrendingUp, BarChart3, CheckCircle2 } from 'lucide-react';

export function OnMarketDealView({
  deal,
  dealId,
  onBack,
  analyzing,
  aiError,
  onRunInitialDiligence,
  canToggleSave,
  savingToggle,
  onToggleSave,
}: {
  deal: Deal;
  dealId: string;
  onBack: () => void;
  analyzing: boolean;
  aiError: string | null;
  onRunInitialDiligence: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
}) {
  const scoring = deal.ai_scoring_json || {};
  const fin = deal.ai_financials_json || {};
  const criteria = deal.criteria_match_json || {};
  const redFlags = normalizeRedFlags(deal.ai_red_flags);
  const qoeRedFlags = fin.qoe_red_flags || [];
  const ownerQuestions = fin.owner_interview_questions || [];

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
    <main className="min-h-screen bg-[#F9FAFB]">
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

            {/* Initial Diligence Run Strip */}
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Initial Diligence</h2>
                  <p className="text-xs text-slate-600">Runs AI based on listing text captured from the browser extension.</p>
                </div>
                <button
                  onClick={onRunInitialDiligence}
                  disabled={analyzing}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  {analyzing ? 'Running…' : deal.ai_summary ? 'Re-run' : 'Run'}
                </button>
              </div>
              {aiError && <p className="text-xs text-red-500 mt-2">{aiError}</p>}
            </section>

            {/* QoE Red Flags - Before regular red flags */}
            <QoeRedFlagsPanel qoeRedFlags={qoeRedFlags} />

            {/* Red Flags */}
            <RedFlagsPanel redFlags={redFlags} />

            {/* Strengths */}
            <div className="rounded-lg border border-green-200 bg-green-50 border-l-4 border-l-green-500 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="text-xl font-semibold text-slate-900">Strengths</h3>
              </div>
              <StrengthsPanel deal={deal} />
            </div>

            {/* AI Investment Memo */}
            <AIInvestmentMemo
              summary={deal.ai_summary}
              emptyText="No diligence memo available yet. Run Initial Diligence to generate one."
            />

            {/* Financial Details */}
            <FinancialSnapshot fin={fin} deal={deal} />

            {/* Owner Interview Questions */}
            <OwnerInterviewQuestions questions={ownerQuestions} />

            {/* Scoring Breakdown */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-slate-600" />
                <h3 className="text-xl font-semibold text-slate-900">Scoring Breakdown</h3>
              </div>
              <RiskSignalsCard
                scoring={scoring}
                title=""
                subtitle="Prioritization signals (not a recommendation). Risk signals: High = more risk. Fit/quality signals: High = stronger alignment/quality."
              />
            </div>

            {/* Searcher Fit Analysis */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-slate-600" />
                <h3 className="text-xl font-semibold text-slate-900">Searcher Fit Analysis</h3>
              </div>
              <SearcherSnapshot criteria={criteria} />
            </div>

            {/* Deal Structure Calculator - Only on On-Market pages */}
            <DealStructureCalculator deal={deal} />
          </div>

          {/* Chat Sidebar */}
          <DealChatPanel dealId={dealId} deal={deal} />
        </div>
      </div>
    </main>
  );
}
