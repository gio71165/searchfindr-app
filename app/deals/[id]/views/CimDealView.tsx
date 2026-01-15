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
import type { Deal, FinancialMetrics } from '@/lib/types/deal';
import { BarChart3, TrendingUp, FileCheck, CheckCircle2 } from 'lucide-react';
import { PassDealModal } from '@/components/modals/PassDealModal';

export function CimDealView({
  deal,
  dealId,
  onBack,
  processingCim,
  cimError,
  cimSuccess,
  onRunCim,
}: {
  deal: Deal;
  dealId: string;
  onBack: () => void;
  processingCim: boolean;
  cimError: string | null;
  cimSuccess: boolean;
  onRunCim: () => void;
}) {
  const scoring = deal.ai_scoring_json || {};
  const criteria = deal.criteria_match_json || {};
  const finRaw = deal.ai_financials_json || {};
  const finRawAny = finRaw as Record<string, unknown>;

  // Build fin object compatible with FinancialMetrics type, extracting from various possible field names
  const revenueValue = finRaw.revenue ?? finRawAny.ttm_revenue ?? finRawAny.revenue_ttm ?? finRawAny.ttmRevenue ?? finRawAny.latest_revenue;
  const ebitdaValue = finRaw.ebitda ?? finRawAny.ttm_ebitda ?? finRawAny.ebitda_ttm ?? finRawAny.ttmEbitda ?? finRawAny.latest_ebitda;
  
  const fin: FinancialMetrics = {
    ...finRaw,
    revenue: Array.isArray(revenueValue) ? revenueValue : undefined,
    ebitda: Array.isArray(ebitdaValue) ? ebitdaValue : undefined,
    margin: finRaw.margin ?? (typeof finRawAny.ebitda_margin === 'string' ? finRawAny.ebitda_margin : undefined) ?? (typeof finRawAny.ebitda_margin_ttm === 'string' ? finRawAny.ebitda_margin_ttm : undefined) ?? (typeof finRawAny.ebitdaMargin === 'string' ? finRawAny.ebitdaMargin : undefined),
    customer_concentration: finRaw.customer_concentration ?? (typeof finRawAny.customer_conc === 'string' ? finRawAny.customer_conc : undefined) ?? (typeof finRawAny.customer_concentration_summary === 'string' ? finRawAny.customer_concentration_summary : undefined),
    qoe_red_flags: Array.isArray(finRaw.qoe_red_flags) ? finRaw.qoe_red_flags : undefined,
    industry_benchmark: finRaw.industry_benchmark ?? undefined,
    owner_interview_questions: Array.isArray(finRaw.owner_interview_questions) ? finRaw.owner_interview_questions : undefined,
  };

  const redFlags = normalizeRedFlags(deal.ai_red_flags);
  const qoeRedFlags = fin.qoe_red_flags || [];
  const ownerQuestions = fin.owner_interview_questions || [];
  const criteriaAny = criteria as Record<string, unknown>;
  const ddChecklist: string[] = Array.isArray(criteriaAny.dd_checklist) ? criteriaAny.dd_checklist.map(String) : [];

  const confidence = getDealConfidence(deal);

  const signals = useMemo(() => {
    return normalizeConfidenceSignals(deal?.ai_confidence_json?.signals ?? null);
  }, [deal?.ai_confidence_json?.signals]);

  const [showPassModal, setShowPassModal] = useState(false);
  const [settingVerdict, setSettingVerdict] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(false);
  const [nextAction, setNextAction] = useState(deal.next_action || '');
  const [reminderDate, setReminderDate] = useState(
    deal.next_action_date ? new Date(deal.next_action_date).toISOString().split('T')[0] : ''
  );

  const handlePassSuccess = () => {
    setShowPassModal(false);
    window.location.href = '/dashboard';
  };

  const handleProceed = async () => {
    setSettingVerdict(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single();
      if (!profile?.workspace_id) throw new Error('No workspace');

      const { error } = await supabase
        .from('companies')
        .update({ 
          verdict: 'proceed',
          last_action_at: new Date().toISOString()
        })
        .eq('id', dealId)
        .eq('workspace_id', profile.workspace_id);

      if (error) throw error;
      window.location.reload();
    } catch (error) {
      console.error('Error setting proceed:', error);
      alert('Failed to set verdict. Please try again.');
    } finally {
      setSettingVerdict(false);
    }
  };

  const handlePark = async () => {
    setSettingVerdict(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single();
      if (!profile?.workspace_id) throw new Error('No workspace');

      const { error } = await supabase
        .from('companies')
        .update({ 
          verdict: 'park',
          last_action_at: new Date().toISOString()
        })
        .eq('id', dealId)
        .eq('workspace_id', profile.workspace_id);

      if (error) throw error;
      window.location.reload();
    } catch (error) {
      console.error('Error setting park:', error);
      alert('Failed to set verdict. Please try again.');
    } finally {
      setSettingVerdict(false);
    }
  };

  // Request Info button removed - functionality not yet implemented
  // const handleRequestInfo = () => {
  //   alert('Coming soon');
  // };

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
              onProceed={handleProceed}
              onPark={handlePark}
              onPass={() => setShowPassModal(true)}
              settingVerdict={settingVerdict}
            />

            {/* Workflow Controls Section */}
            <div className="border rounded-lg p-6 mb-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Deal Workflow</h3>
                <button 
                  onClick={() => setEditingWorkflow(!editingWorkflow)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {editingWorkflow ? 'Done' : 'Edit'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stage Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stage
                  </label>
                  {editingWorkflow ? (
                    <select
                      value={deal.stage || 'new'}
                      onChange={async (e) => {
                        const newStage = e.target.value;
                        await supabase
                          .from('companies')
                          .update({ 
                            stage: newStage,
                            last_action_at: new Date().toISOString()
                          })
                          .eq('id', deal.id);
                        // Refresh deal
                        window.location.reload();
                      }}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="new">New</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="follow_up">Follow-up</option>
                      <option value="ioi_sent">IOI Sent</option>
                      <option value="loi">LOI</option>
                      <option value="dd">Due Diligence</option>
                    </select>
                  ) : (
                    <div className="text-base font-medium capitalize">
                      {deal.stage?.replace(/_/g, ' ') || 'New'}
                    </div>
                  )}
                </div>

                {/* Next Action */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Next Action
                  </label>
                  {editingWorkflow ? (
                    <input
                      type="text"
                      value={nextAction}
                      onChange={(e) => setNextAction(e.target.value)}
                      onBlur={async () => {
                        await supabase
                          .from('companies')
                          .update({ next_action: nextAction })
                          .eq('id', deal.id);
                      }}
                      placeholder="e.g., Call broker to clarify revenue"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  ) : (
                    <div className="text-base">
                      {deal.next_action || <span className="text-gray-400">Not set</span>}
                    </div>
                  )}
                </div>

                {/* Reminder Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up Date
                  </label>
                  {editingWorkflow ? (
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      onBlur={async () => {
                        await supabase
                          .from('companies')
                          .update({ next_action_date: reminderDate })
                          .eq('id', deal.id);
                      }}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  ) : (
                    <div className="text-base">
                      {deal.next_action_date 
                        ? new Date(deal.next_action_date).toLocaleDateString()
                        : <span className="text-gray-400">Not set</span>
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CIM Processing Run Strip */}
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">CIM Processing</h2>
                  <p className="text-xs text-slate-600">Re-run AI analysis on the original CIM PDF.</p>
                </div>
                <button
                  onClick={onRunCim}
                  disabled={processingCim}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
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
            <div className="rounded-lg border border-green-200 bg-green-50 border-l-4 border-l-green-500 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="text-xl font-semibold text-slate-900">Strengths</h3>
              </div>
              <StrengthsPanel deal={deal} />
            </div>

            {/* Data Confidence */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileCheck className="h-5 w-5 text-slate-600" />
                <h3 className="text-xl font-semibold text-slate-900">Data Confidence & Read Quality</h3>
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
                  <span className="text-xs text-slate-600">
                    Updated {safeDateLabel(deal.ai_confidence_json.updated_at) || ''}
                  </span>
                )}
              </div>
              {confidence.analyzed ? (
                signals.length === 0 ? (
                  <p className="text-sm text-slate-600">No confidence signals returned.</p>
                ) : (
                  <SignalsGrid signals={signals} />
                )
              ) : (
                <p className="text-sm text-slate-600">Run AI on CIM to generate read-quality signals.</p>
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
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-slate-600" />
                <h3 className="text-xl font-semibold text-slate-900">CIM Quality & Risk Signals</h3>
              </div>
              <RiskSignalsCard
                scoring={scoring}
                title=""
                subtitle="Interpretation aids from CIM content (not a grade). Risk signals: High = more risk. Quality signals: High = stronger quality. No Tier is produced for CIM uploads."
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

            {/* Due Diligence Checklist */}
            <DiligenceChecklist items={ddChecklist} dealId={dealId} emptyText="No checklist generated yet. Re-run CIM processing to populate this." />
          </div>

          {/* Chat Sidebar */}
          <DealChatPanel dealId={dealId} deal={deal} />
        </div>
      </div>
      
      {showPassModal && (
        <PassDealModal
          dealId={dealId}
          companyName={deal.company_name || 'this deal'}
          workspaceId={deal.workspace_id}
          onClose={() => setShowPassModal(false)}
          onSuccess={handlePassSuccess}
        />
      )}
    </main>
  );
}
