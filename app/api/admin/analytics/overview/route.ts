// app/api/admin/analytics/overview/route.ts
// Admin analytics overview stats

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { authenticateAdmin } from '@/lib/api/admin';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await authenticateRequest(req);
    await authenticateAdmin(supabase, user);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = sevenDaysAgo;

    // Get all stats in parallel
    const [
      totalUsers,
      newUsersThisWeek,
      allDeals,
      activeDeals,
      cimsAllTime,
      cimsThisWeek,
      financialsAllTime,
      financialsThisWeek,
      allUsers,
      activeUsers7d,
      activeSubscriptions,
      trialingSubscriptions,
      subscriptionRevenue,
      trialConversions,
    ] = await Promise.all([
      // Total users
      adminSupabase.from('profiles').select('id', { count: 'exact', head: true }),

      // New users this week
      adminSupabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString()),

      // Total deals
      adminSupabase.from('companies').select('id', { count: 'exact', head: true }),

      // Active deals (not passed/archived)
      adminSupabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null)
        .is('passed_at', null),

      // CIMs all time
      adminSupabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .not('cim_storage_path', 'is', null),

      // CIMs this week
      adminSupabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .not('cim_storage_path', 'is', null)
        .gte('created_at', oneWeekAgo.toISOString()),

      // Financials all time
      adminSupabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .not('financials_storage_path', 'is', null),

      // Financials this week
      adminSupabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .not('financials_storage_path', 'is', null)
        .gte('created_at', oneWeekAgo.toISOString()),

      // All users for churn calculation
      adminSupabase.from('profiles').select('id, created_at'),

      // Users active in last 7 days (from usage_logs or deal_activities)
      adminSupabase
        .from('usage_logs')
        .select('user_id')
        .gte('created_at', sevenDaysAgo.toISOString())
        .not('user_id', 'is', null),

      // Active subscriptions
      adminSupabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_status', 'active'),

      // Trialing subscriptions
      adminSupabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_status', 'trialing'),

      // Calculate MRR (Monthly Recurring Revenue)
      adminSupabase
        .from('profiles')
        .select('subscription_tier, subscription_plan, billing_cycle')
        .in('subscription_status', ['active', 'trialing']),

      // Trial conversions (trials that converted to paid)
      adminSupabase
        .from('trial_history')
        .select('id', { count: 'exact', head: true })
        .eq('converted_to_paid', true),
    ]);

    // Calculate active users (users with any activity in last 7 days)
    const activeUserIds = new Set(
      activeUsers7d.data?.map((log) => log.user_id).filter(Boolean) || []
    );

    // Also check deal_activities for activity
    const { data: recentActivities } = await adminSupabase
      .from('deal_activities')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString())
      .not('user_id', 'is', null);

    recentActivities?.forEach((activity) => {
      if (activity.user_id) {
        activeUserIds.add(activity.user_id);
      }
    });

    const activeUsersCount = activeUserIds.size;
    const totalUsersCount = totalUsers.count || 0;
    const activeUsersPercent =
      totalUsersCount > 0 ? Math.round((activeUsersCount / totalUsersCount) * 100) : 0;

    // Calculate churn risk (users inactive 7+ days)
    const inactiveUsers = allUsers.data?.filter((u) => {
      const userCreated = new Date(u.created_at);
      const daysSinceCreated = (now.getTime() - userCreated.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated >= 7 && !activeUserIds.has(u.id);
    }).length || 0;

    const churnRiskPercent =
      totalUsersCount > 0 ? Math.round((inactiveUsers / totalUsersCount) * 100) : 0;

    // Calculate MRR
    const subscriptionData = subscriptionRevenue.data || [];
    let mrr = 0;
    subscriptionData.forEach((sub) => {
      if (sub.subscription_tier === 'self_funded' && sub.subscription_plan === 'early_bird') {
        mrr += sub.billing_cycle === 'yearly' ? 4900 / 12 : 4900;
      } else if (sub.subscription_tier === 'search_fund' && sub.subscription_plan === 'early_bird') {
        mrr += sub.billing_cycle === 'yearly' ? 14900 / 12 : 14900;
      }
    });
    mrr = mrr / 100; // Convert cents to dollars

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: totalUsersCount,
        newUsersThisWeek: newUsersThisWeek.count || 0,
        activeUsers7d: activeUsersCount,
        activeUsersPercent,
        totalCims: cimsAllTime.count || 0,
        cimsThisWeek: cimsThisWeek.count || 0,
        totalFinancials: financialsAllTime.count || 0,
        financialsThisWeek: financialsThisWeek.count || 0,
        totalDeals: allDeals.count || 0,
        activeDeals: activeDeals.count || 0,
        churnRiskPercent,
        inactiveUsers7d: inactiveUsers,
        activeSubscriptions: activeSubscriptions.count || 0,
        trialingSubscriptions: trialingSubscriptions.count || 0,
        monthlyRecurringRevenue: Math.round(mrr),
        trialConversions: trialConversions.count || 0,
      },
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics overview' },
      { status: 500 }
    );
  }
}
