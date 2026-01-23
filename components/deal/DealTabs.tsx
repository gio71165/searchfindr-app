'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useEffect, useState, useRef } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

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

  // Check if scrolling is needed and show hint on first load
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const hasOverflow = container.scrollWidth > container.clientWidth;
      
      if (hasOverflow) {
        // Check if user has seen the hint before
        const hasSeenHint = localStorage.getItem('deal-tabs-scroll-hint-seen');
        if (!hasSeenHint) {
          setShowScrollHint(true);
          // Hide hint after 5 seconds
          setTimeout(() => {
            setShowScrollHint(false);
            localStorage.setItem('deal-tabs-scroll-hint-seen', 'true');
          }, 5000);
        }
      }
    }
  }, [visibleTabs.length]);

  // Auto-scroll active tab into view
  useEffect(() => {
    const activeButton = document.querySelector(`[data-tab="${validActiveTab}"]`);
    if (activeButton && scrollContainerRef.current) {
      activeButton.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest', 
        inline: 'center' 
      });
    }
  }, [validActiveTab]);

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
      <div className="border-b border-gray-200 mb-6 relative">
        {/* Fade indicator on right side (mobile only) */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 md:hidden" />
        
        {/* Scrollable tabs */}
        <nav 
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth snap-x snap-mandatory md:space-x-8 md:overflow-x-visible md:pb-0"
          aria-label="Tabs"
        >
          {visibleTabs.map((tab) => {
            const isActive = validActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  py-4 px-4 md:px-1 border-b-2 font-medium text-sm transition-colors
                  min-h-[44px] snap-start flex-shrink-0 whitespace-nowrap
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
        
        {/* Scroll hint (shows first time only, mobile only) */}
        {showScrollHint && (
          <div className="absolute -bottom-4 right-4 text-xs text-gray-500 animate-pulse md:hidden">
            Swipe to see more →
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {children(validActiveTab)}
      </div>
    </div>
  );
}
