// app/api/admin/analytics/users-detailed/route.ts
// Detailed user stats for table

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

    const url = new URL(req.url);
    const searchEmail = url.searchParams.get('search');

    // Get all profiles with subscription info
    let profilesQuery = adminSupabase.from('profiles').select('id, workspace_id, created_at, subscription_tier, subscription_plan, subscription_status, billing_cycle');

    if (searchEmail) {
      // Search by email requires joining with auth.users
      // For now, get all and filter client-side, or we can do a more complex query
      // Let's get all and filter in the query
    }

    const { data: profiles } = await profilesQuery;

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        users: [],
      });
    }

    const userIds = profiles.map((p) => p.id);
    const workspaceIds = profiles.map((p) => p.workspace_id).filter(Boolean) as string[];

    // Get user emails
    const userEmails: Record<string, string> = {};
    for (const userId of userIds) {
      try {
        const { data: authData } = await adminSupabase.auth.admin.getUserById(userId);
        if (authData?.user?.email) {
          userEmails[userId] = authData.user.email;
        }
      } catch (err) {
        // Skip if can't get email
      }
    }

    // Get deals per workspace
    const { data: allDeals } = await adminSupabase
      .from('companies')
      .select('workspace_id, stage, cim_storage_path, financials_storage_path, created_at')
      .in('workspace_id', workspaceIds);

    // Get last active from usage_logs
    const { data: usageLogs } = await adminSupabase
      .from('usage_logs')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    // Get last active from deal_activities
    const { data: activities } = await adminSupabase
      .from('deal_activities')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    // Process user stats
    const users = profiles.map((profile) => {
      const workspaceDeals = allDeals?.filter((d) => d.workspace_id === profile.workspace_id) || [];
      const cimsCount = workspaceDeals.filter((d) => d.cim_storage_path).length;
      const financialsCount = workspaceDeals.filter((d) => d.financials_storage_path).length;
      const dealsCount = workspaceDeals.length;

      // Pipeline stage breakdown
      const stageCounts: Record<string, number> = {};
      workspaceDeals.forEach((deal) => {
        const stage = deal.stage || 'new';
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      });

      // Last active (from usage_logs or deal_activities)
      const userUsageLogs = usageLogs?.filter((log) => log.user_id === profile.id) || [];
      const userActivities = activities?.filter((act) => act.user_id === profile.id) || [];
      const lastActiveLog = userUsageLogs[0]?.created_at;
      const lastActiveActivity = userActivities[0]?.created_at;
      const lastActive = lastActiveLog && lastActiveActivity
        ? lastActiveLog > lastActiveActivity
          ? lastActiveLog
          : lastActiveActivity
        : lastActiveLog || lastActiveActivity || null;

      // Check if inactive 7+ days
      const now = new Date();
      const lastActiveDate = lastActive ? new Date(lastActive) : null;
      const daysSinceActive = lastActiveDate
        ? (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
        : null;
      const isInactive = daysSinceActive !== null && daysSinceActive > 7;

      // Format subscription plan
      let planLabel = 'None';
      if (profile.subscription_status && profile.subscription_status !== 'inactive') {
        const tier = profile.subscription_tier === 'self_funded' ? 'Self-Funded' : 'Search Fund';
        const plan = profile.subscription_plan === 'early_bird' ? 'Early Bird' : '';
        const cycle = profile.billing_cycle === 'yearly' ? ' (Annual)' : '';
        const status = profile.subscription_status === 'trialing' ? ' (Trial)' : '';
        planLabel = `${tier} ${plan}${cycle}${status}`.trim();
      }

      return {
        id: profile.id,
        email: userEmails[profile.id] || 'Unknown',
        signedUp: profile.created_at,
        lastActive: lastActive,
        daysSinceActive: daysSinceActive,
        isInactive,
        cimsAnalyzed: cimsCount,
        financialsAnalyzed: financialsCount,
        deals: dealsCount,
        stageBreakdown: stageCounts,
        plan: planLabel,
      };
    });

    // Filter by search email if provided
    const filteredUsers = searchEmail
      ? users.filter((u) => u.email.toLowerCase().includes(searchEmail.toLowerCase()))
      : users;

    return NextResponse.json({
      success: true,
      users: filteredUsers,
    });
  } catch (err) {
    console.error('Users detailed error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}
