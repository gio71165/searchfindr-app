'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import type { Deal, DealActivity } from '@/lib/types/deal';

interface DealWithDays extends Deal {
  days_overdue?: number;
  days_in_stage?: number;
}

export function useTodayData() {
  const { user, workspaceId, loading: authLoading } = useAuth();
  const [followUpsNeeded, setFollowUpsNeeded] = useState<DealWithDays[]>([]);
  const [stuckDeals, setStuckDeals] = useState<DealWithDays[]>([]);
  const [proceedWithoutAction, setProceedWithoutAction] = useState<Deal[]>([]);
  const [recentActivity, setRecentActivity] = useState<DealActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTodayData = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];

      // Optimize: Only select columns we actually need
      const dealColumns = 'id,company_name,next_action_date,stage,last_action_at,created_at,verdict,next_action';
      
      // Optimize: Run all queries in parallel for better performance
      const [followupsResult, reviewingResult, proceedResult, activityResult] = await Promise.all([
        // Query 1: Follow-ups needed (overdue or due today)
        (async () => {
          let query = supabase
            .from('companies')
            .select(dealColumns)
            .eq('workspace_id', workspaceId)
            .lte('next_action_date', today)
            .not('next_action_date', 'is', null)
            .not('stage', 'eq', 'passed')
            .not('stage', 'eq', 'closed_won')
            .not('stage', 'eq', 'closed_lost')
            .order('next_action_date', { ascending: true });
          
          query = query.is('archived_at', null) as typeof query;
          let { data, error } = await query;
          
          if (error && (error.message?.includes('archived_at') || error.code === '42703')) {
            const { data: fallback } = await supabase
              .from('companies')
              .select(dealColumns)
              .eq('workspace_id', workspaceId)
              .lte('next_action_date', today)
              .not('next_action_date', 'is', null)
              .not('stage', 'eq', 'passed')
              .not('stage', 'eq', 'closed_won')
              .not('stage', 'eq', 'closed_lost')
              .order('next_action_date', { ascending: true });
            data = fallback;
          }
          return data || [];
        })(),
        
        // Query 2: Deals stuck in reviewing (>7 days)
        (async () => {
          let query = supabase
            .from('companies')
            .select(dealColumns)
            .eq('workspace_id', workspaceId)
            .eq('stage', 'reviewing')
            .order('last_action_at', { ascending: true, nullsFirst: true });
          
          query = query.is('archived_at', null) as typeof query;
          let { data, error } = await query;
          
          if (error && (error.message?.includes('archived_at') || error.code === '42703')) {
            const { data: fallback } = await supabase
              .from('companies')
              .select(dealColumns)
              .eq('workspace_id', workspaceId)
              .eq('stage', 'reviewing')
              .order('last_action_at', { ascending: true, nullsFirst: true });
            data = fallback;
          }
          return data || [];
        })(),
        
        // Query 3: Proceed deals without next action
        (async () => {
          let query = supabase
            .from('companies')
            .select(dealColumns)
            .eq('workspace_id', workspaceId)
            .eq('verdict', 'proceed')
            .not('stage', 'eq', 'passed')
            .not('stage', 'eq', 'closed_won')
            .not('stage', 'eq', 'closed_lost')
            .order('created_at', { ascending: false });
          
          query = query.is('archived_at', null) as typeof query;
          let { data, error } = await query;
          
          if (error && (error.message?.includes('archived_at') || error.code === '42703')) {
            const { data: fallback } = await supabase
              .from('companies')
              .select(dealColumns)
              .eq('workspace_id', workspaceId)
              .eq('verdict', 'proceed')
              .not('stage', 'eq', 'passed')
              .not('stage', 'eq', 'closed_won')
              .not('stage', 'eq', 'closed_lost')
              .order('created_at', { ascending: false });
            data = fallback;
          }
          return data || [];
        })(),
        
        // Query 4: Recent activity
        supabase
          .from('deal_activities')
          .select('id,deal_id,activity_type,description,created_at,metadata')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(20)
          .then(({ data }) => data || [])
      ]);

      // Process followups with days calculation
      const todayDate = new Date();
      const followupsWithDays = (followupsResult as Deal[]).map((deal) => {
        const actionDate = new Date(deal.next_action_date!);
        const daysDiff = Math.floor((todayDate.getTime() - actionDate.getTime()) / (1000 * 60 * 60 * 24));
        return { ...deal, days_overdue: daysDiff } as DealWithDays;
      });
      setFollowUpsNeeded(followupsWithDays);

      // Process stuck deals
      const stuckWithDays = (reviewingResult as Deal[])
        .map((deal) => {
          const lastAction = new Date(deal.last_action_at || deal.created_at!);
          const daysDiff = Math.floor((todayDate.getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24));
          return { ...deal, days_in_stage: daysDiff } as DealWithDays;
        })
        .filter((d) => (d.days_in_stage ?? 0) > 7);
      setStuckDeals(stuckWithDays);

      // Process proceed deals
      const proceedWithoutNext = (proceedResult as Deal[]).filter((d) => !d.next_action);
      setProceedWithoutAction(proceedWithoutNext);

      // Process activity with company names
      const dealIds = [...new Set(activityResult.map((a: any) => a.deal_id))];
      if (dealIds.length > 0) {
        let companiesQuery = supabase
          .from('companies')
          .select('id, company_name')
          .in('id', dealIds);
        
        companiesQuery = companiesQuery.is('archived_at', null) as typeof companiesQuery;
        let { data: companies, error: companiesError } = await companiesQuery;
        
        if (companiesError && (companiesError.message?.includes('archived_at') || companiesError.code === '42703')) {
          const { data: fallback } = await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', dealIds);
          companies = fallback;
        }

        const companyMap = new Map((companies || []).map((c: any) => [c.id, c.company_name]));
        const activityWithNames = activityResult.map((a: any) => ({
          ...a,
          company_name: companyMap.get(a.deal_id) || 'Unknown'
        }));
        setRecentActivity(activityWithNames);
      } else {
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error loading today data:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadTodayData();
  }, [authLoading, user, loadTodayData]);

  return {
    followUpsNeeded,
    stuckDeals,
    proceedWithoutAction,
    recentActivity,
    loading: authLoading || loading
  };
}
