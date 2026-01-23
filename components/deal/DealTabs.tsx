'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import type { Deal } from '@/lib/types/deal';

export type TabId = 'analysis' | 'modeling' | 'ioi' | 'loi' | 'diligence' | 'documents' | 'deal_management' | 'activity';

interface Tab {
  id: TabId;
  label: string;
  visible: boolean;
}

interface DealTabsProps {
  deal: Deal;
  children: (activeTab: TabId) => React.ReactNode;
}

export function DealTabs({ deal, children }: DealTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabId) || 'analysis';

  const tabs: Tab[] = useMemo(() => {
    const stage = deal.stage || 'new';
    const verdict = deal.verdict;

    return [
      {
        id: 'analysis',
        label: 'Analysis',
        visible: true, // Most important - always visible
      },
      {
        id: 'modeling',
        label: 'Modeling',
        visible: verdict === 'proceed' || stage !== 'new',
      },
      {
        id: 'ioi',
        label: 'IOI',
        visible: true, // Always visible - part of search fund workflow
      },
      {
        id: 'loi',
        label: 'LOI',
        visible: true, // Always visible - part of search fund workflow
      },
      {
        id: 'diligence',
        label: 'Diligence',
        visible: stage === 'dd' || stage === 'loi', // Show when in DD or LOI stage
      },
      {
        id: 'documents',
        label: 'Documents',
        visible: ['ioi_sent', 'loi', 'dd', 'passed'].includes(stage),
      },
      {
        id: 'deal_management',
        label: 'Deal Management',
        visible: true, // Always visible - but less prominent (last before activity)
      },
      {
        id: 'activity',
        label: 'Activity',
        visible: true, // Always visible but least important (last)
      },
    ];
  }, [deal.stage, deal.verdict]);

  const visibleTabs = tabs.filter(tab => tab.visible);
  const validActiveTab = visibleTabs.find(tab => tab.id === activeTab)?.id || visibleTabs[0]?.id || 'analysis';

  const handleTabChange = (tabId: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`?${params.toString()}`, { scroll: false });
    
    // Track financials tab view (modeling tab for financials deals)
    if (tabId === 'modeling' && deal.source_type === 'financials') {
      window.dispatchEvent(new CustomEvent('onboarding:financials-tab-viewed'));
    }
  };

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {visibleTabs.map((tab) => {
            const isActive = validActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {children(validActiveTab)}
      </div>
    </div>
  );
}
