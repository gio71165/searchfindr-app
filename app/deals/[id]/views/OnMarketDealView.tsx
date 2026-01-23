'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';
import { DealChatPanel } from '../components/DealChatPanel';
import { BrokerSelector } from '@/components/deal/BrokerSelector';
import { DealDocuments } from '@/components/deal/DealDocuments';
import { BackButton } from '../components/BackButton';
import { DealTabs, type TabId } from '@/components/deal/DealTabs';
import { StickyDealHeader } from '../components/StickyDealHeader';
import { AnalysisTab } from '@/components/deal/tabs/AnalysisTab';
import { ModelingTab } from '@/components/deal/tabs/ModelingTab';
import { DocumentsTab } from '@/components/deal/tabs/DocumentsTab';
import { DiligenceTab } from '@/components/deal/tabs/DiligenceTab';
import { ActivityTab } from '@/components/deal/tabs/ActivityTab';
import { DealManagementTab } from '@/components/deal/tabs/DealManagementTab';
import { IOIGenerator } from '../components/IOIGenerator';
import { LOIGenerator } from '../components/LOIGenerator';
import type { Deal } from '@/lib/types/deal';
import { PassDealModal } from '@/components/modals/PassDealModal';
import { useKeyboardShortcuts, createShortcut } from '@/lib/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { showToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import { logger } from '@/lib/utils/logger';

export function OnMarketDealView({
  deal,
  dealId,
  onBack,
  analyzing,
  aiError,
  onRunInitialDiligence,
  onRefresh,
}: {
  deal: Deal;
  dealId: string;
  onBack: () => void;
  analyzing: boolean;
  aiError: string | null;
  onRunInitialDiligence: () => void;
  onRefresh?: () => void;
}) {
  const { user, workspaceId, session } = useAuth();
  const [showPassModal, setShowPassModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [settingVerdict, setSettingVerdict] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(false);

  const handlePassSuccess = () => {
    setShowPassModal(false);
    window.location.href = '/dashboard';
  };

  const handleProceed = async () => {
    setSettingVerdict(true);
    try {
      if (!user || !workspaceId) throw new Error('Not signed in or missing workspace');

      const { error } = await supabase
        .from('companies')
        .update({ 
          verdict: 'proceed',
          last_action_at: new Date().toISOString()
        })
        .eq('id', dealId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      showToast('Marked as Proceed', 'success', 2000);
      // Track proceed action
      window.dispatchEvent(new CustomEvent('onboarding:deal-proceeded'));
      // Refresh deal data instead of full page reload
      onRefresh?.();
    } catch (error) {
      logger.error('Error setting proceed:', error);
      showToast('Failed to set verdict. Please try again.', 'error');
    } finally {
      setSettingVerdict(false);
    }
  };

  const handlePark = async () => {
    setSettingVerdict(true);
    try {
      if (!user || !workspaceId) throw new Error('Not signed in or missing workspace');

      const { error } = await supabase
        .from('companies')
        .update({ 
          verdict: 'park',
          last_action_at: new Date().toISOString()
        })
        .eq('id', dealId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      showToast('Marked as Park', 'info', 2000);
      onRefresh?.();
    } catch (error) {
      logger.error('Error setting park:', error);
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
      createShortcut('E', () => {
        setEditingWorkflow(!editingWorkflow);
        showToast(editingWorkflow ? 'Exited edit mode' : 'Entered edit mode', 'info', 1500);
      }, 'Edit deal details', ['deal-detail']),
      createShortcut('?', () => {
        setShowShortcutsModal(true);
      }, 'Show keyboard shortcuts', ['global', 'deal-detail']),
    ],
    true
  );

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
            sourceType="on_market"
            hideVerdictButtons={true}
          />
        );
      case 'modeling':
        return <ModelingTab deal={deal} sourceType="on_market" />;
      case 'ioi':
        return <IOIGenerator deal={deal} />;
      case 'loi':
        return <LOIGenerator deal={deal} />;
      case 'documents':
        return <DocumentsTab deal={deal} dealId={dealId} />;
      case 'diligence':
        return <DiligenceTab deal={deal} dealId={dealId} sourceType="on_market" />;
      case 'documents':
        return <DocumentsTab deal={deal} dealId={dealId} />;
      case 'deal_management':
        return <DealManagementTab deal={deal} dealId={dealId} onRefresh={onRefresh} />;
      case 'activity':
        return <ActivityTab dealId={dealId} />;
      default:
        return null;
    }
  };

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
                  {analyzing ? 'Running…' : deal.ai_summary ? 'Re-run Analysis' : 'Run Analysis'}
                </button>
              </div>
              {aiError && <p className="text-xs text-red-500 mt-2">{aiError}</p>}
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
