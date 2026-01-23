'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';

export interface DealListFilters {
  sourceType?: string;
  stage?: string;
  verdict?: string;
  searchQuery?: string;
  limit?: number;
}

export interface UseDealListOptions {
  sourceType?: string;
  filters?: DealListFilters;
  autoLoad?: boolean;
}

export function useDealList(options: UseDealListOptions = {}) {
  const { workspaceId, loading: authLoading } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    sourceType,
    filters = {},
    autoLoad = true,
  } = options;

  const loadDeals = useCallback(async (wsId: string) => {
    if (!wsId) {
      setLoading(false);
      return;
    }

    try {
      // Optimized: Only fetch columns needed for DealCard display
      const columns = 'id,company_name,location_city,location_state,industry,source_type,final_tier,created_at,stage,verdict,next_action_date,sba_eligible,deal_size_band,is_saved,asking_price_extracted,ebitda_ttm_extracted,next_action,archived_at';
      const columnsNoArchived = 'id,company_name,location_city,location_state,industry,source_type,final_tier,created_at,stage,verdict,next_action_date,sba_eligible,deal_size_band,is_saved,asking_price_extracted,ebitda_ttm_extracted,next_action';

      let query = supabase
        .from('companies')
        .select(columns)
        .eq('workspace_id', wsId)
        .is('passed_at', null)
        .order('created_at', { ascending: false })
        .limit(filters.limit || 100);

      // Apply source type filter if provided
      if (sourceType) {
        query = query.eq('source_type', sourceType);
      }

      // Try to filter archived_at
      query = query.is('archived_at', null) as typeof query;

      const { data, error: queryError } = await query;

      if (queryError) {
        const msg = (queryError as { message?: string }).message || '';
        const code = (queryError as { code?: string }).code || '';
        const hint = (queryError as { hint?: string }).hint || '';
        const useFallback = msg.includes('archived_at') || msg.includes('column') || code === '42703' || hint.includes('archived_at');

        if (useFallback) {
          // Fallback query without archived_at
          let fallbackQuery = supabase
            .from('companies')
            .select(columnsNoArchived)
            .eq('workspace_id', wsId)
            .is('passed_at', null)
            .order('created_at', { ascending: false })
            .limit(filters.limit || 100);

          if (sourceType) {
            fallbackQuery = fallbackQuery.eq('source_type', sourceType);
          }

          const { data: fallbackData, error: fallbackError } = await fallbackQuery;

          if (fallbackError) {
            setError(`Failed to load deals: ${fallbackError.message || 'Unknown error'}`);
            setLoading(false);
            return;
          }

          setDeals((fallbackData ?? []).map((d: any) => ({
            ...d,
            score: d.score ?? null,
            listing_url: d.listing_url ?? null,
            passed_at: d.passed_at ?? null,
            archived_at: null,
          })));
          setLoading(false);
          return;
        }

        setError(`Failed to load deals: ${msg || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      setDeals((data ?? []).map((d: any) => ({
        ...d,
        score: d.score ?? null,
        listing_url: d.listing_url ?? null,
        passed_at: d.passed_at ?? null,
      })));
      setError(null);
    } catch (err: any) {
      setError(`Failed to load deals: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [sourceType, filters.limit]);

  useEffect(() => {
    if (!autoLoad) return;
    if (authLoading) return;
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    loadDeals(workspaceId).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, authLoading, autoLoad, loadDeals]);

  return {
    deals,
    loading,
    error,
    reload: () => workspaceId && loadDeals(workspaceId),
  };
}
