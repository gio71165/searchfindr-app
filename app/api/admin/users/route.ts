// app/api/admin/users/route.ts
// Admin endpoint to list all users

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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get all profiles
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('id, workspace_id, is_admin, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (profilesError) {
      throw profilesError;
    }

    // Get total count
    const { count } = await adminSupabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // Get user emails from auth.users
    const userIds = profiles?.map((p) => p.id) || [];
    const userEmails: Record<string, string> = {};

    // Get emails for each user
    for (const userId of userIds) {
      try {
        const { data: authData } = await adminSupabase.auth.admin.getUserById(userId);
        if (authData?.user?.email) {
          userEmails[userId] = authData.user.email;
        }
      } catch (err) {
        console.error(`Failed to get email for user ${userId}:`, err);
      }
    }

    // Get deal counts per user
    const dealCounts: Record<string, number> = {};
    if (userIds.length > 0) {
      const { data: deals } = await adminSupabase
        .from('companies')
        .select('workspace_id')
        .in('workspace_id', profiles?.map((p) => p.workspace_id).filter(Boolean) || []);

      deals?.forEach((deal) => {
        const profile = profiles?.find((p) => p.workspace_id === deal.workspace_id);
        if (profile) {
          dealCounts[profile.id] = (dealCounts[profile.id] || 0) + 1;
        }
      });
    }

    // Get usage stats per user (last 7 days)
    const usageStats: Record<string, { requests: number; lastActive: string | null }> = {};
    if (userIds.length > 0) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: usage } = await adminSupabase
        .from('usage_logs')
        .select('user_id, created_at')
        .in('user_id', userIds)
        .gte('created_at', sevenDaysAgo);

      usage?.forEach((log) => {
        if (!usageStats[log.user_id!]) {
          usageStats[log.user_id] = { requests: 0, lastActive: null };
        }
        usageStats[log.user_id].requests++;
        if (!usageStats[log.user_id].lastActive || log.created_at > usageStats[log.user_id].lastActive!) {
          usageStats[log.user_id].lastActive = log.created_at;
        }
      });
    }

    // Combine data
    const users = profiles?.map((profile) => ({
      id: profile.id,
      email: userEmails[profile.id] || 'Unknown',
      workspace_id: profile.workspace_id,
      is_admin: profile.is_admin === true,
      created_at: profile.created_at,
      deal_count: dealCounts[profile.id] || 0,
      usage_7d: usageStats[profile.id] || { requests: 0, lastActive: null },
    })) || [];

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AdminError') {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: (err as any).statusCode || 403 }
      );
    }
    console.error('Admin users error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
