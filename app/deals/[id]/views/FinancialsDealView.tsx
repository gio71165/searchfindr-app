'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { DealChatPanel } from '../components/DealChatPanel';
import { StickyDealHeader } from '../components/StickyDealHeader';
import { BackButton } from '../components/BackButton';
import { DealTabs, type TabId } from '@/components/deal/DealTabs';
import { AnalysisTab } from '@/components/deal/tabs/AnalysisTab';
import { ModelingTab } from '@/components/deal/tabs/ModelingTab';
import { ActivityTab } from '@/components/deal/tabs/ActivityTab';
import { IOIGenerator } from '../components/IOIGenerator';
import { LOIGenerator } from '../components/LOIGenerator';
import type { Deal, FinancialAnalysis } from '@/lib/types/deal';
import { PassDealModal } from '@/components/modals/PassDealModal';
import { useKeyboardShortcuts, createShortcut } from '@/lib/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { showToast } from '@/components/ui/Toast';

export function FinancialsDealView({
  deal,
  dealId,
  onBack,
  loadingAnalysis,
  running,
  analysis,
  error,
  onRun,
  onRefresh,
}: {
  deal: Deal;
  dealId: string;
  onBack: () => void;
  loadingAnalysis: boolean;
  running: boolean;
  analysis: FinancialAnalysis | null;
  error: string | null;
  onRun: () => void;
  onRefresh?: () => void;
}) {
  const [showPassModal, setShowPassModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [settingVerdict, setSettingVerdict] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(false);
  const [dealManagementOpen, setDealManagementOpen] = useState(false);
  const [nextAction, setNextAction] = useState(deal.next_action || '');
  const [reminderDate, setReminderDate] = useState(
    deal.next_action_date ? new Date(deal.next_action_date).toISOString().split('T')[0] : ''
  );
  // Local state for stage to allow immediate UI updates
  const [localStage, setLocalStage] = useState(deal.stage || 'new');

  // Sync localStage when deal prop changes
  useEffect(() => {
    setLocalStage(deal.stage || 'new');
  }, [deal.stage]);

  const hasAnyAnalysis = Boolean(analysis);
  const showLoadingLine = loadingAnalysis && !hasAnyAnalysis;
  const diligenceNotes = analysis?.diligence_notes ? (Array.isArray(analysis.diligence_notes) ? analysis.diligence_notes : [analysis.diligence_notes]) : [];

  const renderTabContent = (activeTab: TabId) => {
    switch (activeTab) {
      case 'analysis':
        return (
          <AnalysisTab
            deal={deal}
            dealId={dealId}
            onProceed={handleProceed}
            onPark={handlePark}
            onPass={() => setShowPassModal(true)}
            settingVerdict={settingVerdict}
            sourceType="financials"
            financialAnalysis={analysis}
            hideVerdictButtons={true}
          />
        );
      case 'modeling':
        return <ModelingTab deal={deal} sourceType="financials" />;
      case 'ioi':
        return <IOIGenerator deal={deal} />;
      case 'loi':
        return <LOIGenerator deal={deal} />;
      case 'activity':
        return <ActivityTab dealId={dealId} />;
      default:
        return null;
    }
  };

  const handlePassSuccess = () => {
    setShowPassModal(false);
    window.location.href = '/dashboard';
  };

  const handleProceed = async () => {
    setSettingVerdict(true);
    try {
      // Use getSession() for better performance - faster than getUser()
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
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
      showToast('Marked as Proceed', 'success', 2000);
      // Track proceed action
      window.dispatchEvent(new CustomEvent('onboarding:deal-proceeded'));
      onRefresh?.();
    } catch (error) {
      console.error('Error setting proceed:', error);
      showToast('Failed to set verdict. Please try again.', 'error');
    } finally {
      setSettingVerdict(false);
    }
  };

  const handlePark = async () => {
    setSettingVerdict(true);
    try {
      // Use getSession() for better performance - faster than getUser()
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
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
      showToast('Marked as Park', 'info', 2000);
      onRefresh?.();
    } catch (error) {
      console.error('Error setting park:', error);
      showToast('Failed to set verdict. Please try again.', 'error');
    } finally {
      setSettingVerdict(false);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      createShortcut('P', () => {
        if (!settingVerdict) {
          handleProceed();
        }
      }, 'Mark as Proceed', ['deal-detail']),
      createShortcut('K', () => {
        if (!settingVerdict) {
          handlePark();
        }
      }, 'Mark as Park', ['deal-detail']),
      createShortcut('X', () => {
        if (!settingVerdict) {
          setShowPassModal(true);
          showToast('Opening pass modal', 'info', 1500);
        }
      }, 'Open Pass modal', ['deal-detail']),
      createShortcut('?', () => {
        setShowShortcutsModal(true);
      }, 'Show keyboard shortcuts', ['global', 'deal-detail']),
    ],
    true
  );

  return (
    <main className="min-h-screen bg-[#F9FAFB] overflow-x-hidden">
      <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6">
        <BackButton dealSourceType={deal.source_type} />
        
        {/* Sticky Header with Verdict Buttons - Moved to top immediately after BackButton */}
        <StickyDealHeader
          deal={deal}
          onProceed={handleProceed}
          onPark={handlePark}
          onPass={() => setShowPassModal(true)}
          settingVerdict={settingVerdict}
        />
        
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="flex-1 lg:pr-6 space-y-6 sm:space-y-8 min-w-0">
            {/* Financial Analysis Run Strip */}
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Financial Analysis</h2>
                  <p className="text-xs text-slate-600">
                    Runs AI on the uploaded financials attached to this deal. Skeptical read on earnings quality, missing items, and risk signals.
                  </p>
                </div>
                <button
                  onClick={onRun}
                  disabled={running}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  {running ? 'Running…' : analysis ? 'Re-run Analysis' : 'Run Analysis'}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
              {showLoadingLine && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Analyzing financials... Expected time: 20-40 seconds
                  </p>
                  <p className="text-xs text-blue-700">
                    AI is extracting financial data, analyzing quality of earnings, and identifying red flags. This typically takes 20-40 seconds depending on file size.
                  </p>
                </div>
              )}
              {!hasAnyAnalysis && !showLoadingLine && (
                <p className="text-sm mt-3 text-slate-600">
                  No analysis yet. Click "Run Analysis" to generate outputs and populate sections below.
                </p>
              )}
            </section>

            {/* Tab Navigation and Content - Now appears first */}
            <DealTabs deal={deal}>
              {renderTabContent}
            </DealTabs>

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
          deal={deal}
          onClose={() => setShowPassModal(false)}
          onSuccess={handlePassSuccess}
        />
      )}

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        currentContext="deal-detail"
      />

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShowShortcutsModal(true)}
          className="text-xs text-slate-500 hover:text-slate-700 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors"
          aria-label="Show keyboard shortcuts"
        >
          Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs">?</kbd> for shortcuts
        </button>
      </div>
    </main>
  );
}
