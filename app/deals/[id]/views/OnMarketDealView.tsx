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
import { PassDealModal } from '@/components/modals/PassDealModal';

export function OnMarketDealView({
  deal,
  dealId,
  onBack,
  analyzing,
  aiError,
  onRunInitialDiligence,
}: {
  deal: Deal;
  dealId: string;
  onBack: () => void;
  analyzing: boolean;
  aiError: string | null;
  onRunInitialDiligence: () => void;
}) {
  const scoring = deal.ai_scoring_json || {};
  const fin = deal.ai_financials_json || {};
  const criteria = deal.criteria_match_json || {};
  const redFlags = normalizeRedFlags(deal.ai_red_flags);
  const qoeRedFlags = fin.qoe_red_flags || [];
  const ownerQuestions = fin.owner_interview_questions || [];

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

  const handleRequestInfo = () => {
    alert('Coming soon');
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

  return (
    <main className="min-h-screen bg-[#F9FAFB] overflow-x-hidden">
      <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6">
        <BackButton dealSourceType={deal.source_type} />
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="flex-1 lg:pr-6 space-y-6 sm:space-y-8 min-w-0">
            {/* Executive Summary Card */}
            <ExecutiveSummaryCard
              deal={deal}
              onProceed={handleProceed}
              onPark={handlePark}
              onPass={() => setShowPassModal(true)}
              onRequestInfo={handleRequestInfo}
              settingVerdict={settingVerdict}
            />

            {/* Workflow Controls Section */}
            <div className="border rounded-lg p-4 sm:p-6 mb-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold">Deal Workflow</h3>
                <button 
                  onClick={() => setEditingWorkflow(!editingWorkflow)}
                  className="text-sm text-blue-600 hover:text-blue-800 min-h-[44px] px-3 touch-manipulation"
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
