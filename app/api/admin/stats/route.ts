// app/api/admin/stats/route.ts
// Admin dashboard statistics endpoint

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { authenticateAdmin } from '@/lib/api/admin';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { supabase, user } = await authenticateRequest(req);
    
    // Verify admin access
    await authenticateAdmin(supabase, user);

    // Use service role for admin queries
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all statistics
    const [
      totalUsers,
      totalWorkspaces,
      totalDeals,
      recentUsers,
      recentActivities,
      endpointStats,
      workspaceStats,
    ] = await Promise.all([
      // Total users count
      adminSupabase
        .from('profiles')
        .select('id', { count: 'exact', head: true }),

      // Total workspaces count (unique workspace_ids)
      adminSupabase
        .from('profiles')
        .select('workspace_id')
        .not('workspace_id', 'is', null),

      // Total deals count
      adminSupabase
        .from('companies')
        .select('id', { count: 'exact', head: true }),

      // Recent users (last 7 days)
      adminSupabase
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10),

      // Recent activities (last 24 hours)
      adminSupabase
        .from('deal_activities')
        .select('id, activity_type, created_at, workspace_id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50),

      // Endpoint usage stats (last 24 hours)
      adminSupabase
        .from('usage_logs')
        .select('endpoint, status_code, response_time_ms')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

      // Workspace stats
      adminSupabase
        .from('companies')
        .select('workspace_id')
        .not('workspace_id', 'is', null),
    ]);

    // Process endpoint stats
    const endpointUsage: Record<string, { count: number; avgResponseTime: number; errors: number }> = {};
    endpointStats.data?.forEach((log) => {
      if (!endpointUsage[log.endpoint]) {
        endpointUsage[log.endpoint] = { count: 0, avgResponseTime: 0, errors: 0 };
      }
      endpointUsage[log.endpoint].count++;
      if (log.response_time_ms) {
        endpointUsage[log.endpoint].avgResponseTime += log.response_time_ms;
      }
      if (log.status_code && log.status_code >= 400) {
        endpointUsage[log.endpoint].errors++;
      }
    });

    // Calculate averages
    Object.keys(endpointUsage).forEach((endpoint) => {
      const stats = endpointUsage[endpoint];
      stats.avgResponseTime = stats.count > 0 
        ? Math.round(stats.avgResponseTime / stats.count) 
        : 0;
    });

    // Process workspace stats
    const workspaceDealCounts: Record<string, number> = {};
    workspaceStats.data?.forEach((deal) => {
      if (deal.workspace_id) {
        workspaceDealCounts[deal.workspace_id] = (workspaceDealCounts[deal.workspace_id] || 0) + 1;
      }
    });

    // Get unique workspace count
    const uniqueWorkspaces = new Set(workspaceStats.data?.map((d) => d.workspace_id).filter(Boolean) || []);

    // Get rate limit stats
    const rateLimitStats = await adminSupabase
      .from('rate_limits')
      .select('key, count')
      .order('updated_at', { ascending: false })
      .limit(100);

    const rateLimitUsage: Record<string, number> = {};
    rateLimitStats.data?.forEach((rl) => {
      const parts = rl.key.split(':');
      if (parts.length >= 3) {
        const endpoint = parts.slice(2).join(':');
        rateLimitUsage[endpoint] = (rateLimitUsage[endpoint] || 0) + rl.count;
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers.count || 0,
          recent: recentUsers.data?.length || 0,
        },
        workspaces: {
          total: uniqueWorkspaces.size,
        },
        deals: {
          total: totalDeals.count || 0,
        },
        activities: {
          recent24h: recentActivities.data?.length || 0,
        },
        endpoints: endpointUsage,
        rateLimits: rateLimitUsage,
        workspaceDealCounts: Object.entries(workspaceDealCounts)
          .map(([id, count]) => ({ workspace_id: id, deal_count: count }))
          .sort((a, b) => b.deal_count - a.deal_count)
          .slice(0, 10),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AdminError') {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: (err as any).statusCode || 403 }
      );
    }
    console.error('Admin stats error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}
