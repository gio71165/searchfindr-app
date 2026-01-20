// app/api/admin/analytics/feature-adoption/route.ts
// Feature adoption percentages

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

    // Get total users
    const { count: totalUsers } = await adminSupabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (!totalUsers || totalUsers === 0) {
      return NextResponse.json({
        success: true,
        features: [],
      });
    }

    // Get all users with their workspace_ids
    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('id, workspace_id')
      .not('workspace_id', 'is', null);

    const workspaceIds = profiles?.map((p) => p.workspace_id).filter(Boolean) || [];
    const userIds = profiles?.map((p) => p.id) || [];

    // Feature adoption queries
    const [
      pipelineUsers, // Users with any deals
      cimUsers, // Users with deals that have CIM
      financialsUsers, // Users with deals that have financials
      extensionUsers, // Users with deals from extension
      offMarketUsers, // Users with deals from off-market
      reminderUsers, // Users with reminders set
      chatUsers, // Users with chat messages
    ] = await Promise.all([
      // Pipeline (has any deals)
      adminSupabase
        .from('companies')
        .select('workspace_id')
        .in('workspace_id', workspaceIds)
        .limit(10000),

      // CIM Analysis
      adminSupabase
        .from('companies')
        .select('workspace_id')
        .in('workspace_id', workspaceIds)
        .not('cim_storage_path', 'is', null)
        .limit(10000),

      // Financials Analysis
      adminSupabase
        .from('companies')
        .select('workspace_id')
        .in('workspace_id', workspaceIds)
        .not('financials_storage_path', 'is', null)
        .limit(10000),

      // Chrome Extension
      adminSupabase
        .from('companies')
        .select('workspace_id')
        .in('workspace_id', workspaceIds)
        .eq('source_type', 'extension')
        .limit(10000),

      // Off-Market Search
      adminSupabase
        .from('companies')
        .select('workspace_id')
        .in('workspace_id', workspaceIds)
        .eq('source_type', 'off-market')
        .limit(10000),

      // Reminders
      adminSupabase
        .from('companies')
        .select('workspace_id')
        .in('workspace_id', workspaceIds)
        .not('next_action_date', 'is', null)
        .limit(10000),

      // Deal Chat
      adminSupabase
        .from('deal_chat_messages')
        .select('user_id')
        .in('user_id', userIds)
        .limit(10000),
    ]);

    // Count unique users per feature
    const pipelineUserIds = new Set(
      pipelineUsers.data?.map((d) => {
        const profile = profiles?.find((p) => p.workspace_id === d.workspace_id);
        return profile?.id;
      }).filter(Boolean) || []
    );

    const cimUserIds = new Set(
      cimUsers.data?.map((d) => {
        const profile = profiles?.find((p) => p.workspace_id === d.workspace_id);
        return profile?.id;
      }).filter(Boolean) || []
    );

    const financialsUserIds = new Set(
      financialsUsers.data?.map((d) => {
        const profile = profiles?.find((p) => p.workspace_id === d.workspace_id);
        return profile?.id;
      }).filter(Boolean) || []
    );

    const extensionUserIds = new Set(
      extensionUsers.data?.map((d) => {
        const profile = profiles?.find((p) => p.workspace_id === d.workspace_id);
        return profile?.id;
      }).filter(Boolean) || []
    );

    const offMarketUserIds = new Set(
      offMarketUsers.data?.map((d) => {
        const profile = profiles?.find((p) => p.workspace_id === d.workspace_id);
        return profile?.id;
      }).filter(Boolean) || []
    );

    const reminderUserIds = new Set(
      reminderUsers.data?.map((d) => {
        const profile = profiles?.find((p) => p.workspace_id === d.workspace_id);
        return profile?.id;
      }).filter(Boolean) || []
    );

    const chatUserIds = new Set(chatUsers.data?.map((d) => d.user_id).filter(Boolean) || []);

    // Calculate percentages
    const features = [
      {
        name: 'Pipeline',
        adoption: Math.round((pipelineUserIds.size / totalUsers) * 100),
        users: pipelineUserIds.size,
      },
      {
        name: 'CIM Analysis',
        adoption: Math.round((cimUserIds.size / totalUsers) * 100),
        users: cimUserIds.size,
      },
      {
        name: 'Financials Analysis',
        adoption: Math.round((financialsUserIds.size / totalUsers) * 100),
        users: financialsUserIds.size,
      },
      {
        name: 'Chrome Extension',
        adoption: Math.round((extensionUserIds.size / totalUsers) * 100),
        users: extensionUserIds.size,
      },
      {
        name: 'Off-Market Search',
        adoption: Math.round((offMarketUserIds.size / totalUsers) * 100),
        users: offMarketUserIds.size,
      },
      {
        name: 'Reminders',
        adoption: Math.round((reminderUserIds.size / totalUsers) * 100),
        users: reminderUserIds.size,
      },
      {
        name: 'Deal Chat',
        adoption: Math.round((chatUserIds.size / totalUsers) * 100),
        users: chatUserIds.size,
      },
    ];

    return NextResponse.json({
      success: true,
      features,
      totalUsers,
    });
  } catch (err) {
    console.error('Feature adoption error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feature adoption' },
      { status: 500 }
    );
  }
}
