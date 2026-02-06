// app/api/deals/[id]/next-steps/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { NotFoundError } from '@/lib/data-access/base';
import type { NextStepsPayload } from '@/lib/types/deal';

export const runtime = 'nodejs';

/**
 * PATCH /api/deals/[id]/next-steps
 * Update next_steps (e.g. toggle step completed). Body: { next_steps: NextStepsPayload }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const { supabase, workspace } = await authenticateRequest(req);

    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || !body.next_steps) {
      return NextResponse.json(
        { error: 'Missing or invalid next_steps in request body' },
        { status: 400 }
      );
    }

    const raw = body.next_steps as NextStepsPayload;
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.steps)) {
      return NextResponse.json(
        { error: 'next_steps must have { generated_at: string, steps: array }' },
        { status: 400 }
      );
    }

    const deals = new DealsRepository(supabase, workspace.id);
    await deals.getById(dealId); // ensure exists and workspace access

    const { error } = await supabase
      .from('companies')
      .update({
        next_steps: {
          generated_at: typeof raw.generated_at === 'string' ? raw.generated_at : new Date().toISOString(),
          steps: raw.steps,
        },
      })
      .eq('id', dealId)
      .eq('workspace_id', workspace.id);

    if (error) {
      console.error('next-steps PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update next steps' }, { status: 500 });
    }

    revalidatePath(`/deals/${dealId}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error('next-steps PATCH error:', e);
    return NextResponse.json({ error: 'Unable to update next steps' }, { status: 500 });
  }
}
