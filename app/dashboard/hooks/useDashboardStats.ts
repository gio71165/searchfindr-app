import { useMemo } from 'react';

type Deal = {
  id: string;
  created_at: string | null;
  is_saved: boolean | null;
  passed_at: string | null;
  ai_confidence_json?: {
    level?: 'low' | 'medium' | 'high' | null;
  } | null;
};

export function useDashboardStats(deals: Deal[]) {
  return useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter out passed deals (should already be filtered in query, but double-check)
    const activeDeals = deals.filter((deal) => !deal.passed_at);

    const totalDeals = activeDeals.length;
    
    const newToday = activeDeals.filter((deal) => {
      if (!deal.created_at) return false;
      const created = new Date(deal.created_at);
      return created >= oneDayAgo;
    }).length;

    const saved = activeDeals.filter((deal) => deal.is_saved === true).length;

    const highConfidence = activeDeals.filter((deal) => {
      return deal.ai_confidence_json?.level === 'high';
    }).length;

    return {
      totalDeals,
      newToday,
      saved,
      highConfidence,
    };
  }, [deals]);
}
