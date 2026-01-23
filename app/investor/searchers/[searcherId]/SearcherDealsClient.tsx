'use client';

import { useState, useEffect, useCallback } from 'react';
import { DealCard } from '@/components/ui/DealCard';
import { supabase } from '@/app/supabaseClient';
import { useInvestorRealtime } from '../../hooks/useInvestorRealtime';

interface SearcherDealsClientProps {
  initialDeals: any[];
  workspaceId: string;
  investorId: string;
  searcherId: string;
}

export function SearcherDealsClient({
  initialDeals,
  workspaceId,
  investorId,
  searcherId,
}: SearcherDealsClientProps) {
  const [deals, setDeals] = useState(initialDeals);
  const [loading, setLoading] = useState(false);

  const loadDeals = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `/api/investor/searchers/${searcherId}/deals?workspace=${workspaceId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!res.ok) {
        console.error('Failed to load deals');
        return;
      }

      const data = await res.json();
      setDeals(data.deals || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  }, [searcherId, workspaceId]);

  // Set up realtime subscription for this workspace
  useInvestorRealtime({
    workspaceIds: [workspaceId],
    onUpdate: loadDeals,
    enabled: !!workspaceId,
  });

  useEffect(() => {
    // Initial load
    loadDeals();
  }, [loadDeals]);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Searcher Pipeline
        </h1>
        <p className="text-slate-600">
          {loading ? 'Loading...' : `${deals.length} ${deals.length === 1 ? 'deal' : 'deals'} in pipeline`}
        </p>
      </div>
      
      {deals.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <p className="text-slate-600">No deals in pipeline for this searcher.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {deals.map((deal: any) => (
            <DealCard
              key={deal.id}
              deal={deal}
              isSelected={false}
              onToggleSelect={() => {}}
              canSelect={false}
            />
          ))}
        </div>
      )}
    </>
  );
}
