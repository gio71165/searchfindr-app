'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { DealCard } from '@/components/ui/DealCard';
import { ContentHeader } from '@/components/dashboard/ContentHeader';
import { PipelineSummary } from '@/components/dashboard/PipelineSummary';
import { VerdictFilters } from '@/components/dashboard/VerdictFilters';

export default function OnMarketPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedVerdict, setSelectedVerdict] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('workspace_id')
          .eq('id', user.id)
          .single();

        if (!profile?.workspace_id) {
          setLoading(false);
          return;
        }

        await loadDeals(profile.workspace_id);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  async function loadDeals(workspaceId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('source_type', 'on_market')
      .is('passed_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('loadDeals error:', error);
      return;
    }

    setDeals(data || []);
  }

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

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
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
          onClick={() => window.open('/extension/callback', '_blank', 'noopener,noreferrer')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Browse More On-Market Deals
        </button>
      </div>

      {/* Results */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredDeals.length} of {deals.length} deals
      </div>

      {/* Deal Cards */}
      {filteredDeals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-xl font-semibold mb-2">No on-market deals yet</h3>
          <p className="text-gray-600 mb-6">
            Use the extension to capture deals from BizBuySell and other listing sites
          </p>
          <button
            onClick={() => window.open('/extension/callback', '_blank', 'noopener,noreferrer')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Browse Listings
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
  );
}
