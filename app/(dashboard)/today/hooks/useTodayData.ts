'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';

export function useTodayData() {
  const [followUpsNeeded, setFollowUpsNeeded] = useState<any[]>([]);
  const [stuckDeals, setStuckDeals] = useState<any[]>([]);
  const [proceedWithoutAction, setProceedWithoutAction] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayData();
  }, []);

  async function loadTodayData() {
    try {
      // Get current user and workspace
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
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

      const workspaceId = profile.workspace_id;
      const today = new Date().toISOString().split('T')[0];

      // Query 1: Follow-ups needed (overdue or due today)
      let followupsQuery = supabase
        .from('companies')
        .select('*')
        .eq('workspace_id', workspaceId)
        .lte('next_action_date', today)
        .not('next_action_date', 'is', null)
        .not('stage', 'eq', 'passed')
        .not('stage', 'eq', 'closed_won')
        .not('stage', 'eq', 'closed_lost')
        .order('next_action_date', { ascending: true });
      
      // Add archived_at filter if column exists (try-catch handled by error check below)
      followupsQuery = followupsQuery.is('archived_at', null) as typeof followupsQuery;
      
      let { data: followups, error: followupsError } = await followupsQuery;
      
      // If column doesn't exist, retry without archived_at filter
      if (followupsError && (followupsError.message?.includes('archived_at') || followupsError.code === '42703')) {
        const { data: fallbackData } = await supabase
          .from('companies')
          .select('*')
          .eq('workspace_id', workspaceId)
          .lte('next_action_date', today)
          .not('next_action_date', 'is', null)
          .not('stage', 'eq', 'passed')
          .not('stage', 'eq', 'closed_won')
          .not('stage', 'eq', 'closed_lost')
          .order('next_action_date', { ascending: true });
        followups = fallbackData;
      }

      // Add days_overdue calculation
      const followupsWithDays = (followups || []).map(deal => {
        const actionDate = new Date(deal.next_action_date);
        const todayDate = new Date();
        const daysDiff = Math.floor(
          (todayDate.getTime() - actionDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          ...deal,
          days_overdue: daysDiff
        };
      });

      setFollowUpsNeeded(followupsWithDays);

      // Query 2: Deals stuck in reviewing (>7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get all reviewing deals, then filter client-side for better null handling
      let reviewingQuery = supabase
        .from('companies')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('stage', 'reviewing')
        .order('last_action_at', { ascending: true, nullsFirst: true });
      
      reviewingQuery = reviewingQuery.is('archived_at', null) as typeof reviewingQuery;
      
      let { data: reviewingDeals, error: reviewingError } = await reviewingQuery;
      
      // If column doesn't exist, retry without archived_at filter
      if (reviewingError && (reviewingError.message?.includes('archived_at') || reviewingError.code === '42703')) {
        const { data: fallbackData } = await supabase
          .from('companies')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('stage', 'reviewing')
          .order('last_action_at', { ascending: true, nullsFirst: true });
        reviewingDeals = fallbackData;
      }

      // Filter to only those stuck (>7 days) and calculate days
      const stuckWithDays = (reviewingDeals || [])
        .map(deal => {
          const lastAction = new Date(deal.last_action_at || deal.created_at);
          const todayDate = new Date();
          const daysDiff = Math.floor(
            (todayDate.getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            ...deal,
            days_in_stage: daysDiff
          };
        })
        .filter(deal => deal.days_in_stage > 7);

      setStuckDeals(stuckWithDays);

      // Query 3: Proceed deals without next action
      let proceedQuery = supabase
        .from('companies')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('verdict', 'proceed')
        .not('stage', 'eq', 'passed')
        .not('stage', 'eq', 'closed_won')
        .not('stage', 'eq', 'closed_lost')
        .order('created_at', { ascending: false });
      
      proceedQuery = proceedQuery.is('archived_at', null) as typeof proceedQuery;
      
      let { data: proceedData, error: proceedError } = await proceedQuery;
      
      // If column doesn't exist, retry without archived_at filter
      if (proceedError && (proceedError.message?.includes('archived_at') || proceedError.code === '42703')) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('companies')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('verdict', 'proceed')
          .not('stage', 'eq', 'passed')
          .not('stage', 'eq', 'closed_won')
          .not('stage', 'eq', 'closed_lost')
          .order('created_at', { ascending: false });
        proceedData = fallbackData;
        proceedError = fallbackError;
      }

      if (proceedError) {
        console.error('Error fetching proceed without action:', proceedError);
        setProceedWithoutAction([]);
      } else {
        const proceedWithoutNext = (proceedData || []).filter((deal: any) => !deal.next_action);
        setProceedWithoutAction(proceedWithoutNext);
      }

      // Query 4: Recent activity
      // First get activities, then fetch company names separately for better reliability
      const { data: activity } = await supabase
        .from('deal_activities')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch company names for the deals (exclude archived)
      const dealIds = [...new Set((activity || []).map(a => a.deal_id))];
      let companiesQuery = supabase
        .from('companies')
        .select('id, company_name')
        .in('id', dealIds);
      
      companiesQuery = companiesQuery.is('archived_at', null) as typeof companiesQuery;
      
      let { data: companies, error: companiesError } = await companiesQuery;
      
      // If column doesn't exist, retry without archived_at filter
      if (companiesError && (companiesError.message?.includes('archived_at') || companiesError.code === '42703')) {
        const { data: fallbackData } = await supabase
          .from('companies')
          .select('id, company_name')
          .in('id', dealIds);
        companies = fallbackData;
      }

      const companyMap = new Map((companies || []).map(c => [c.id, c.company_name]));

      // Combine activity with company names
      const activityWithNames = (activity || []).map(a => ({
        ...a,
        company_name: companyMap.get(a.deal_id) || 'Unknown'
      }));

      setRecentActivity(activityWithNames);
    } catch (error) {
      console.error('Error loading today data:', error);
    } finally {
      setLoading(false);
    }
  }

  return {
    followUpsNeeded,
    stuckDeals,
    proceedWithoutAction,
    recentActivity,
    loading
  };
}
