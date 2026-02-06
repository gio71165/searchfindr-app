'use client';

import { useState, useRef } from 'react';
import { DealChatPanel } from '../components/DealChatPanel';
import { BackButton } from '../components/BackButton';
import { DealTabs, type TabId } from '@/components/deal/DealTabs';
import { StickyDealHeader } from '../components/StickyDealHeader';
import { AnalysisTab } from '@/components/deal/tabs/AnalysisTab';
import { ModelingTab } from '@/components/deal/tabs/ModelingTab';
import { ActivityTab } from '@/components/deal/tabs/ActivityTab';
import { DealManagementTab } from '@/components/deal/tabs/DealManagementTab';
import { IOIGenerator } from '../components/IOIGenerator';
import { LOIGenerator } from '../components/LOIGenerator';
import type { Deal } from '@/lib/types/deal';
import { DealVerdictModals } from '../components/DealVerdictModals';
import { useBrokerName } from '../hooks/useBrokerName';
import { useKeyboardShortcuts, createShortcut } from '@/lib/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { showToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import { logger } from '@/lib/utils/logger';

export function CimDealView({
  deal,
  dealId,
  onBack,
  processingCim,
  cimError,
  cimSuccess,
  onRunCim,
  onRefresh,
}: {
  deal: Deal;
  dealId: string;
  onBack: () => void;
  processingCim: boolean;
  cimError: string | null;
  cimSuccess: boolean;
  onRunCim: () => void;
  onRefresh?: () => void;
}) {
  const { user, workspaceId } = useAuth();
  const [showPassModal, setShowPassModal] = useState(false);
  const [showProceedModal, setShowProceedModal] = useState(false);
  const [showParkModal, setShowParkModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [settingVerdict, setSettingVerdict] = useState(false);
  const brokerName = useBrokerName(deal?.broker_id, workspaceId ?? deal?.workspace_id);
  const sessionStartedAtRef = useRef<number>(Date.now());

  const handlePassSuccess = () => {
    setShowPassModal(false);
    window.location.href = '/dashboard';
  };

  const handleProceed = () => {
    setShowProceedModal(true);
  };

  const handleProceedSuccess = () => {
    setShowProceedModal(false);
    window.dispatchEvent(new CustomEvent('onboarding:deal-proceeded'));
    onRefresh?.();
  };

  const handlePark = () => {
    setShowParkModal(true);
  };

  const handleParkSuccess = () => {
    setShowParkModal(false);
    onRefresh?.();
  };

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      createShortcut('P', () => {
        if (!settingVerdict && !showProceedModal) handleProceed();
      }, 'Mark as Proceed', ['deal-detail']),
      createShortcut('K', () => {
        if (!settingVerdict && !showParkModal) handlePark();
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

  // Request Info button removed - functionality not yet implemented
  // const handleRequestInfo = () => {
  //   alert('Coming soon');
  // };

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
            sourceType="cim_pdf"
            hideVerdictButtons={true}
            processingCim={processingCim}
            cimError={cimError}
            cimSuccess={cimSuccess}
            onRunCim={onRunCim}
          />
        );
      case 'modeling':
        return <ModelingTab deal={deal} sourceType="cim_pdf" />;
      case 'ioi':
        return <IOIGenerator deal={deal} />;
      case 'loi':
        return <LOIGenerator deal={deal} />;
      case 'management':
        return (
          <DealManagementTab
            deal={deal}
            dealId={dealId}
            onRefresh={onRefresh}
          />
        );
      case 'activity':
        return <ActivityTab dealId={dealId} />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 overflow-x-hidden">
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
        
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 min-w-0 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 lg:pr-6 space-y-6 sm:space-y-8 min-w-0 overflow-hidden">
            {/* Tab Navigation and Content - Now appears first */}
            <DealTabs deal={deal}>
              {renderTabContent}
            </DealTabs>

          </div>

          {/* Chat Sidebar */}
          <DealChatPanel dealId={dealId} deal={deal} />
        </div>
      </div>
      
      <DealVerdictModals
        deal={deal}
        dealId={dealId}
        brokerName={brokerName}
        sessionStartedAtRef={sessionStartedAtRef}
        showPassModal={showPassModal}
        setShowPassModal={setShowPassModal}
        showProceedModal={showProceedModal}
        setShowProceedModal={setShowProceedModal}
        showParkModal={showParkModal}
        setShowParkModal={setShowParkModal}
        onPassSuccess={handlePassSuccess}
        onProceedSuccess={handleProceedSuccess}
        onParkSuccess={handleParkSuccess}
      />

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        currentContext="deal-detail"
      />

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShowShortcutsModal(true)}
          className="text-xs text-slate-500 hover:text-slate-300 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm transition-colors"
          aria-label="Show keyboard shortcuts"
        >
          Press <kbd className="px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-300">?</kbd> for shortcuts
        </button>
      </div>
    </main>
  );
}
