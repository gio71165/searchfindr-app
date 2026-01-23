'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { findComparableDeals } from '@/lib/ai/deal-comparables';
import type { Deal } from '@/lib/types/deal';
import { DealCard } from '@/components/ui/DealCard';
import { Skeleton } from '@/components/ui/Skeleton';

interface ComparableDealsProps {
  deal: Deal;
  workspaceId: string;
}

export function ComparableDeals({ deal, workspaceId }: ComparableDealsProps) {
  const [comparables, setComparables] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadComparables() {
      try {
        setLoading(true);
        const results = await findComparableDeals(deal, workspaceId, 5);
        setComparables(results);
      } catch (error) {
        console.error('Error loading comparable deals:', error);
      } finally {
        setLoading(false);
      }
    }

    if (deal && workspaceId) {
      loadComparables();
    }
  }, [deal, workspaceId]);

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Similar Deals You've Seen
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} height={300} />
          ))}
        </div>
      </div>
    );
  }

  if (comparables.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">
        Similar Deals You've Seen
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comparables.map(comparable => (
          <DealCard
            key={comparable.id}
            deal={comparable as any}
            isSelected={false}
            onToggleSelect={() => {}}
            canSelect={false}
          />
        ))}
      </div>
    </div>
  );
}
