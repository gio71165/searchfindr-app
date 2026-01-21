import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { DatabaseError } from '@/lib/data-access/base';

export async function POST(req: NextRequest) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    const body = await req.json();
    const dealIds = Array.isArray(body?.dealIds) ? body.dealIds : [];

    if (dealIds.length === 0) {
      return NextResponse.json({ error: 'No deal IDs provided' }, { status: 400 });
    }

    // Update all deals to passed
    const updates = dealIds.map((dealId: string) => ({
      id: dealId,
      verdict: 'pass',
      stage: 'passed',
      passed_at: new Date().toISOString(),
      last_action_at: new Date().toISOString(),
    }));

    let updatedCount = 0;
    for (const update of updates) {
      try {
        await deals.update(update.id, {
          verdict: update.verdict,
          stage: update.stage,
          passed_at: update.passed_at,
          last_action_at: update.last_action_at,
        });
        updatedCount++;
      } catch (err) {
        console.error(`Failed to update deal ${update.id}:`, err);
        // Continue with other deals
      }
    }

    return NextResponse.json({ 
      success: true, 
      updated: updatedCount,
      total: dealIds.length 
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Bulk pass error:', error);
    return NextResponse.json({ error: 'Failed to mark deals as pass' }, { status: 500 });
  }
}
