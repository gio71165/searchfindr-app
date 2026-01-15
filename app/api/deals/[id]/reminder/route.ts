// app/api/deals/[id]/reminder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { NotFoundError } from '@/lib/data-access/base';
import { logger } from '@/lib/utils/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    const { id: dealId } = await params;
    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal ID' }, { status: 400 });
    }

    // Verify deal belongs to workspace
    let deal;
    try {
      deal = await deals.getById(dealId);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
      }
      throw err;
    }

    const body = await req.json().catch(() => ({}));
    const { date, action, clear } = body;

    // Handle clear request
    if (clear === true) {
      await supabase
        .from('companies')
        .update({
          next_action_date: null,
          next_action: null,
          reminded_at: null,
        })
        .eq('id', dealId)
        .eq('workspace_id', workspace.id);

      return NextResponse.json({ success: true });
    }

    // Validate date for set request
    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid date' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate action (optional but must be string if provided)
    const actionText = action && typeof action === 'string' 
      ? action.trim() 
      : 'Follow up';

    // Update deal with reminder
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        next_action_date: date,
        next_action: actionText,
        reminded_at: null, // Reset reminder flag
        last_action_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .eq('workspace_id', workspace.id);

    if (updateError) {
      logger.error('Error updating reminder:', updateError);
      return NextResponse.json(
        { error: 'Failed to set reminder' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase
      .from('deal_activities')
      .insert({
        workspace_id: workspace.id,
        deal_id: dealId,
        user_id: user.id,
        activity_type: 'reminder_set',
        description: `Reminder set for ${new Date(date).toLocaleDateString()}: ${actionText}`,
        metadata: {
          reminder_date: date,
          action: actionText,
        },
      })
      .catch((err) => {
        // Log but don't fail the request if activity logging fails
        logger.warn('Failed to log reminder activity:', err);
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    logger.error('reminder API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}