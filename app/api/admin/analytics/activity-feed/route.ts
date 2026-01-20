// app/api/admin/analytics/activity-feed/route.ts
// Recent activity feed

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

    // Get last 50 activities
    const { data: activities } = await adminSupabase
      .from('deal_activities')
      .select('id, user_id, activity_type, description, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!activities || activities.length === 0) {
      return NextResponse.json({
        success: true,
        events: [],
      });
    }

    // Get user emails
    const userIds = [...new Set(activities.map((a) => a.user_id).filter(Boolean))];
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

    // Also get CIM and financials uploads from companies table
    const { data: recentDeals } = await adminSupabase
      .from('companies')
      .select('workspace_id, company_name, cim_storage_path, financials_storage_path, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);

    // Get workspace to user mapping
    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('id, workspace_id');

    const workspaceToUser: Record<string, string> = {};
    profiles?.forEach((p) => {
      if (p.workspace_id) {
        workspaceToUser[p.workspace_id] = p.id;
      }
    });

    // Format events
    const events: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: string;
      icon: string;
    }> = [];

    // Add deal activities
    activities.forEach((activity) => {
      const email = activity.user_id ? userEmails[activity.user_id] || 'Unknown' : 'System';
      let message = '';
      let icon = '📋';

      switch (activity.activity_type) {
        case 'cim_analyzed':
          message = `${email} analyzed a CIM`;
          icon = '📄';
          break;
        case 'stage_change':
          const newStage = activity.metadata?.new_stage || 'unknown';
          message = `${email} moved a deal to ${newStage} stage`;
          icon = '🔄';
          break;
        case 'verdict_set':
          message = `${email} set a verdict`;
          icon = '✅';
          break;
        case 'passed':
          message = `${email} passed on a deal`;
          icon = '❌';
          break;
        default:
          message = `${email}: ${activity.description}`;
      }

      events.push({
        id: activity.id,
        type: activity.activity_type,
        message,
        timestamp: activity.created_at,
        icon,
      });
    });

    // Add CIM and financials uploads
    recentDeals?.forEach((deal) => {
      const userId = deal.workspace_id ? workspaceToUser[deal.workspace_id] : null;
      const email = userId ? userEmails[userId] || 'Unknown' : 'Unknown';
      const companyName = deal.company_name || 'a deal';

      if (deal.cim_storage_path && deal.updated_at) {
        events.push({
          id: `cim-${deal.workspace_id}-${deal.updated_at}`,
          type: 'cim_upload',
          message: `${email} uploaded a CIM for ${companyName}`,
          timestamp: deal.updated_at,
          icon: '📄',
        });
      }

      if (deal.financials_storage_path && deal.updated_at) {
        events.push({
          id: `fin-${deal.workspace_id}-${deal.updated_at}`,
          type: 'financials_upload',
          message: `${email} uploaded financials for ${companyName}`,
          timestamp: deal.updated_at,
          icon: '📊',
        });
      }
    });

    // Sort by timestamp descending and limit to 50
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const finalEvents = events.slice(0, 50);

    return NextResponse.json({
      success: true,
      events: finalEvents,
    });
  } catch (err) {
    console.error('Activity feed error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity feed' },
      { status: 500 }
    );
  }
}
