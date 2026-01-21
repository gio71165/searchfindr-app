import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { NotFoundError, DatabaseError } from '@/lib/data-access/base';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    const { id: dealId } = await params;
    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal ID' }, { status: 400 });
    }

    const body = await req.json();
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : null;

    // Validate length
    if (notes && notes.length > 1000) {
      return NextResponse.json({ error: 'Notes must be 1000 characters or less' }, { status: 400 });
    }

    // Verify deal exists and belongs to workspace
    await deals.getById(dealId);

    // Update notes
    await deals.update(dealId, {
      user_notes: notes || null,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Update notes error:', error);
    return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 });
  }
}
