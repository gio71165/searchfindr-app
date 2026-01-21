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
    const tags = Array.isArray(body?.tags) ? body.tags.filter((t: any) => typeof t === 'string' && t.trim().length > 0).map((t: string) => t.trim()) : [];

    // Validate length (max 20 tags, each max 50 chars)
    if (tags.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 tags allowed' }, { status: 400 });
    }

    for (const tag of tags) {
      if (tag.length > 50) {
        return NextResponse.json({ error: 'Each tag must be 50 characters or less' }, { status: 400 });
      }
    }

    // Verify deal exists and belongs to workspace
    await deals.getById(dealId);

    // Update tags
    await deals.update(dealId, {
      tags: tags.length > 0 ? tags : [],
    });

    return NextResponse.json({ success: true, tags });
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
    console.error('Update tags error:', error);
    return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 });
  }
}
