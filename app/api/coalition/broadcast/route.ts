import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { authenticateCoalitionLeader } from '@/lib/api/admin';
import { getCoalitionDashboardData } from '@/lib/data-access/coalition';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await authenticateRequest(req);
    await authenticateCoalitionLeader(supabase, user);

    const body = await req.json().catch(() => ({}));
    const message =
      (body.message as string)?.trim() ||
      'Consider moving deals forward — your pipeline is waiting!';
    const targetStage = (body.target_stage as string) || 'reviewing';

    const data = await getCoalitionDashboardData();
    const workspaceIds =
      targetStage === 'reviewing'
        ? data.reviewingWorkspaceIds
        : data.reviewingWorkspaceIds; // reuse; could extend to other stages later

    if (workspaceIds.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No searchers currently in Reviewing stage.', recipientCount: 0 },
        { status: 200 }
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: broadcast, error: broadcastError } = await admin
      .from('coalition_broadcasts')
      .insert({
        sent_by: user.id,
        message,
        target_stage: targetStage,
      })
      .select('id')
      .single();

    if (broadcastError || !broadcast) {
      return NextResponse.json(
        { error: broadcastError?.message || 'Failed to create broadcast' },
        { status: 500 }
      );
    }

    const recipients = workspaceIds.map((workspace_id) => ({
      broadcast_id: broadcast.id,
      workspace_id,
    }));

    const { error: recipientsError } = await admin
      .from('coalition_broadcast_recipients')
      .insert(recipients);

    if (recipientsError) {
      return NextResponse.json(
        { error: recipientsError.message || 'Failed to add recipients' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Nudge sent to ${workspaceIds.length} searcher(s) in ${targetStage}.`,
        recipientCount: workspaceIds.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    const status = error?.statusCode ?? 500;
    const message = error?.message ?? 'Failed to send broadcast';
    return NextResponse.json({ error: message }, { status });
  }
}
