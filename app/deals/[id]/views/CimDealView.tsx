'use client';

import { useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { ExecutiveSummaryCard } from '../components/ExecutiveSummaryCard';
import { DealChatPanel } from '../components/DealChatPanel';
import { ConfidencePill } from '../components/ConfidencePill';
import { SignalsGrid } from '../components/SignalsGrid';
import { AIInvestmentMemo } from '../components/AIInvestmentMemo';
import { FinancialSnapshot } from '../components/FinancialSnapshot';
import { RiskSignalsCard } from '../components/RiskSignalsCard';
import { SearcherSnapshot } from '../components/SearcherSnapshot';
import { RedFlagsPanel } from '../components/RedFlagsPanel';
import { QoeRedFlagsPanel } from '../components/QoeRedFlagsPanel';
import { StrengthsPanel } from '../components/StrengthsPanel';
import { OwnerInterviewQuestions } from '../components/OwnerInterviewQuestions';
import { DiligenceChecklist } from '../components/DiligenceChecklist';
import { BackButton } from '../components/BackButton';
import { getDealConfidence } from '../lib/confidence';
import { normalizeRedFlags, normalizeConfidenceSignals } from '../lib/normalizers';
import { safeDateLabel } from '../lib/formatters';
import type { Deal } from '@/lib/types/deal';
import { BarChart3, TrendingUp, FileCheck, CheckCircle2 } from 'lucide-react';

export function CimDealView({
  deal,
  dealId,
  onBack,
  processingCim,
  cimError,
  cimSuccess,
  onRunCim,
  canToggleSave,
  savingToggle,
  onToggleSave,
}: {
  deal: Deal;
  dealId: string;
  onBack: () => void;
  processingCim: boolean;
  cimError: string | null;
  cimSuccess: boolean;
  onRunCim: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
}) {
  const scoring = deal.ai_scoring_json || {};
  const criteria = deal.criteria_match_json || {};
  const finRaw = deal.ai_financials_json || {};

  const fin = {
    revenue:
      finRaw.revenue ??
      finRaw.ttm_revenue ??
      finRaw.revenue_ttm ??
      finRaw.ttmRevenue ??
      finRaw.latest_revenue ??
      null,
    ebitda:
      finRaw.ebitda ??
      finRaw.ttm_ebitda ??
      finRaw.ebitda_ttm ??
      finRaw.ttmEbitda ??
      finRaw.latest_ebitda ??
      null,
    margin: finRaw.ebitda_margin ?? finRaw.ebitda_margin_ttm ?? finRaw.margin ?? finRaw.ebitdaMargin ?? null,
    customer_concentration:
      finRaw.customer_concentration ?? finRaw.customer_conc ?? finRaw.customer_concentration_summary ?? null,
    revenue_1y_ago: finRaw.revenue_1y_ago ?? finRaw.revenue_last_year ?? finRaw.revenue_fy1 ?? null,
    revenue_2y_ago: finRaw.revenue_2y_ago ?? finRaw.revenue_two_years_ago ?? finRaw.revenue_fy2 ?? null,
    revenue_cagr_3y:
      finRaw.revenue_cagr_3y ?? finRaw.revenue_3yr_cagr ?? finRaw.revenue_cagr_3yr ?? finRaw.rev_cagr_3y ?? null,
    capex_intensity: finRaw.capex_intensity ?? finRaw.capex_pct_revenue ?? null,
    working_capital_needs: finRaw.working_capital_needs ?? finRaw.working_capital_profile ?? null,
    qoe_red_flags: finRaw.qoe_red_flags || [],
    industry_benchmark: finRaw.industry_benchmark || null,
    owner_interview_questions: finRaw.owner_interview_questions || [],
  };

  const redFlags = normalizeRedFlags(deal.ai_red_flags);
  const qoeRedFlags = fin.qoe_red_flags || [];
  const ownerQuestions = fin.owner_interview_questions || [];
  const ddChecklist: string[] = Array.isArray(criteria.dd_checklist) ? criteria.dd_checklist.map(String) : [];

  const confidence = getDealConfidence(deal);

  const signals = useMemo(() => {
    return normalizeConfidenceSignals(deal?.ai_confidence_json?.signals ?? null);
  }, [deal?.ai_confidence_json?.signals]);

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

      // Navigate back to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      alert(`Failed to pass deal: ${error.message}`);
    } finally {
      setPassing(false);
    }
  };

  // Request Info button removed - functionality not yet implemented
  // const handleRequestInfo = () => {
  //   alert('Coming soon');
  // };

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
              savingToggle={savingToggle}
              canToggleSave={canToggleSave}
            />

            {/* CIM Processing Run Strip */}
            <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">CIM Processing</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Re-run AI analysis on the original CIM PDF.</p>
                </div>
                <button
                  onClick={onRunCim}
                  disabled={processingCim}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  {processingCim ? 'Processing…' : 'Re-run'}
                </button>
              </div>
              {cimError && <p className="text-xs text-red-500 mt-2">{cimError}</p>}
              {cimSuccess && <p className="text-xs text-green-600 mt-2">CIM processed successfully. Analysis is up to date.</p>}
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

            {/* Data Confidence */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileCheck className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Data Confidence & Read Quality</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <ConfidencePill
                  icon={confidence.icon}
                  label={confidence.label}
                  title={confidence.reason}
                  analyzed={confidence.analyzed}
                  level={confidence.level}
                />
                {deal?.ai_confidence_json?.updated_at && (
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Updated {safeDateLabel(deal.ai_confidence_json.updated_at) || ''}
                  </span>
                )}
              </div>
              {confidence.analyzed ? (
                signals.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">No confidence signals returned.</p>
                ) : (
                  <SignalsGrid signals={signals} />
                )
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">Run AI on CIM to generate read-quality signals.</p>
              )}
            </div>

            {/* AI Investment Memo */}
            <AIInvestmentMemo
              summary={deal.ai_summary}
              emptyText="No AI summary available yet. Re-run CIM processing to generate an investment memo."
            />

            {/* Financial Details */}
            <FinancialSnapshot fin={fin} deal={deal} />

            {/* Owner Interview Questions */}
            <OwnerInterviewQuestions questions={ownerQuestions} />

            {/* Scoring Breakdown */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">CIM Quality & Risk Signals</h3>
              </div>
              <RiskSignalsCard
                scoring={scoring}
                title=""
                subtitle="Interpretation aids from CIM content (not a grade). Risk signals: High = more risk. Quality signals: High = stronger quality. No Tier is produced for CIM uploads."
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

            {/* Due Diligence Checklist */}
            <DiligenceChecklist items={ddChecklist} dealId={dealId} emptyText="No checklist generated yet. Re-run CIM processing to populate this." />
          </div>

          {/* Chat Sidebar */}
          <DealChatPanel dealId={dealId} deal={deal} />
        </div>
      </div>
    </main>
  );
}
