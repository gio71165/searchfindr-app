import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { DatabaseError } from '@/lib/data-access/base';

const VALID_STAGES = ['new', 'reviewing', 'follow_up', 'ioi_sent', 'loi', 'dd', 'passed', 'closed_won', 'closed_lost'];

export async function POST(req: NextRequest) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    const body = await req.json();
    const dealIds = Array.isArray(body?.dealIds) ? body.dealIds : [];
    const stage = typeof body?.stage === 'string' ? body.stage : null;

    if (dealIds.length === 0) {
      return NextResponse.json({ error: 'No deal IDs provided' }, { status: 400 });
    }

    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    // Update all deals to the new stage
    let updatedCount = 0;
    for (const dealId of dealIds) {
      try {
        await deals.update(dealId, {
          stage,
          last_action_at: new Date().toISOString(),
        });
        updatedCount++;
      } catch (err) {
        console.error(`Failed to update deal ${dealId}:`, err);
        // Continue with other deals
      }
    }

    return NextResponse.json({ 
      success: true, 
      updated: updatedCount,
      total: dealIds.length,
      stage 
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Bulk stage change error:', error);
    return NextResponse.json({ error: 'Failed to update deal stages' }, { status: 500 });
  }
}
