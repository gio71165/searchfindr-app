'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { DealCard } from '@/components/ui/DealCard';
import { ContentHeader } from '@/components/dashboard/ContentHeader';
import { PipelineSummary } from '@/components/dashboard/PipelineSummary';
import { VerdictFilters } from '@/components/dashboard/VerdictFilters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function OnMarketPage() {
  const router = useRouter();
  const { user, workspaceId, loading: authLoading } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedVerdict, setSelectedVerdict] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function loadDeals(workspaceId: string) {
    // Optimized: Only fetch columns needed for DealCard display
    const columns = 'id,company_name,location_city,location_state,industry,source_type,final_tier,created_at,stage,verdict,next_action_date,sba_eligible,deal_size_band,is_saved,asking_price_extracted,ebitda_ttm_extracted,next_action';
    const { data, error } = await supabase
      .from('companies')
      .select(columns)
      .eq('workspace_id', workspaceId)
      .eq('source_type', 'on_market')
      .is('passed_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      // Error handling - could set error state here if needed
      return;
    }

    setDeals(data || []);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    let ok = true;
    loadDeals(workspaceId).finally(() => {
      if (ok) setLoading(false);
    });
    return () => { ok = false; };
  }, [authLoading, user, workspaceId, router]);

  // Apply filters
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      if (selectedStage !== 'all') {
        if (selectedStage === 'passed') {
          if (!deal.passed_at && deal.stage !== 'passed') return false;
        } else {
          if ((deal.stage || 'new') !== selectedStage) return false;
        }
      }
      if (selectedVerdict !== 'all' && deal.verdict !== selectedVerdict) return false;
      if (searchQuery && !deal.company_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [deals, selectedStage, selectedVerdict, searchQuery]);

  // Calculate stage counts
  const stageCounts = useMemo(() => {
    return {
      all: deals.length,
      new: deals.filter(d => (d.stage || 'new') === 'new').length,
      reviewing: deals.filter(d => d.stage === 'reviewing').length,
      follow_up: deals.filter(d => d.stage === 'follow_up').length,
      ioi_sent: deals.filter(d => d.stage === 'ioi_sent').length,
      loi: deals.filter(d => d.stage === 'loi').length,
      dd: deals.filter(d => d.stage === 'dd').length,
      passed: deals.filter(d => d.passed_at !== null || d.stage === 'passed').length
    };
  }, [deals]);

  if (authLoading || loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-sm text-slate-600">Loading on-market deals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <ContentHeader
          title="On-Market Deals"
          description="Deals from BizBuySell, brokers, and other marketplaces"
        />

      {/* Search */}
      <input
        type="text"
        placeholder="Search on-market deals..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-3 border rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Pipeline Summary - Compact variant */}
      <PipelineSummary
        selectedStage={selectedStage}
        setSelectedStage={setSelectedStage}
        stageCounts={stageCounts}
        variant="compact"
      />

      {/* Verdict Filters */}
      <VerdictFilters
        selectedVerdict={selectedVerdict}
        setSelectedVerdict={setSelectedVerdict}
      />

      {/* Action Button */}
      <div className="mb-6">
        <button
          onClick={() => window.open('/settings', '_blank', 'noopener,noreferrer')}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium shadow-sm hover:shadow-md transition-all"
        >
          Get Extension API Key
        </button>
      </div>

      {/* Results */}
      <div className="mb-4 text-sm text-slate-600">
        Showing {filteredDeals.length} of {deals.length} deals
      </div>

      {/* Deal Cards */}
      {filteredDeals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-300">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-xl font-semibold mb-2">No on-market deals yet</h3>
          <p className="text-slate-600 mb-6">
            Use the extension to capture deals from BizBuySell and other listing sites
          </p>
          <button
            onClick={() => window.open('/settings', '_blank', 'noopener,noreferrer')}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium shadow-sm hover:shadow-md transition-all"
          >
            Get Extension API Key
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeals.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
