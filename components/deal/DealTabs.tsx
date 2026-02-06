'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useEffect, useState, useRef } from 'react';
import type { Deal } from '@/lib/types/deal';

export type TabId = 'analysis' | 'modeling' | 'ioi' | 'loi' | 'activity' | 'management';

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
        id: 'management',
        label: 'Manage',
        visible: true,
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
      <div className="border-b border-slate-800 bg-slate-950/50 px-4 mb-6 relative">
        {/* Scrollable tabs */}
        <nav 
          ref={scrollContainerRef}
          className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide scroll-smooth"
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
                  px-4 py-3 rounded-t-lg font-medium text-sm transition-all duration-200
                  flex items-center gap-2 whitespace-nowrap
                  min-h-[44px] snap-start flex-shrink-0
                  ${isActive
                    ? 'bg-slate-900 text-emerald-400 border-t-2 border-t-emerald-500'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
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
          <div className="absolute -bottom-4 right-4 text-xs text-slate-500 animate-pulse md:hidden">
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
