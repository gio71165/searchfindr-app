import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { buildExtractedMetrics, buildFinancialDelta } from '@/lib/data-access/training-data';
import { NotFoundError, DatabaseError } from '@/lib/data-access/base';
import { getCorsHeaders } from '@/lib/api/security';

export const runtime = 'nodejs';

const corsHeaders = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

type VerdictType = 'pass' | 'proceed' | 'park';

/**
 * POST /api/deals/[id]/verdict
 * Set deal verdict (pass, proceed, park) and upsert into training_data for Data Capture Agent.
 * Body: {
 *   verdict_type: 'pass' | 'proceed' | 'park',
 *   searcher_input_text: string (1-sentence reason),
 *   searcher_rating?: number (1-10 gut check),
 *   context_metadata?: { searcher_thesis?, session_duration_seconds?, broker_name? },
 *   financial_delta?: { marketed_ebitda?, adjusted_ebitda? },
 *   green_flags?: string[] (for proceed),
 *   pass_reason?: string (for pass - dropdown),
 *   pass_notes?: string (for pass),
 *   broker_feedback?: string (for pass)
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params;
  try {
    const { supabase, workspace, user } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal ID' }, { status: 400, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const verdictType = body.verdict_type as VerdictType;
    const searcherInputText = typeof body.searcher_input_text === 'string' ? body.searcher_input_text.trim() : '';
    const searcherRating = typeof body.searcher_rating === 'number' && body.searcher_rating >= 1 && body.searcher_rating <= 10
      ? body.searcher_rating
      : null;
    const contextMetadata = (body.context_metadata && typeof body.context_metadata === 'object') ? body.context_metadata : {};
    const financialDelta = (body.financial_delta && typeof body.financial_delta === 'object') ? body.financial_delta : {};
    const greenFlags = Array.isArray(body.green_flags) ? body.green_flags.filter((x: unknown) => typeof x === 'string') : [];

    if (!verdictType || !['pass', 'proceed', 'park'].includes(verdictType)) {
      return NextResponse.json({ error: 'verdict_type must be pass, proceed, or park' }, { status: 400, headers: corsHeaders });
    }
    if (!searcherInputText) {
      return NextResponse.json({ error: 'searcher_input_text (1-sentence reason) is required' }, { status: 400, headers: corsHeaders });
    }

    let deal: Record<string, unknown>;

    if (verdictType === 'pass') {
      const passReason = body.pass_reason || searcherInputText;
      const passNotes = body.pass_notes ?? null;
      const brokerFeedback = body.broker_feedback ?? null;
      const updated = await deals.passDeal(dealId, passReason, passNotes, !!brokerFeedback);
      deal = updated as unknown as Record<string, unknown>;
      if (brokerFeedback && typeof brokerFeedback === 'string') {
        const feedbackNote = `Broker Feedback:\n\n${brokerFeedback.trim()}`;
        const existingNotes = (deal.user_notes as string) || '';
        const updatedNotes = existingNotes ? `${existingNotes}\n\n---\n\n${feedbackNote}` : feedbackNote;
        await deals.update(dealId, { user_notes: updatedNotes });
      }
    } else {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('companies')
        .update({ verdict: verdictType, last_action_at: now })
        .eq('id', dealId)
        .eq('workspace_id', workspace.id)
        .select()
        .single();
      if (error || !data) {
        if (error?.code === 'PGRST116') throw new NotFoundError(`Deal ${dealId} not found`);
        throw new DatabaseError(error?.message ?? 'Failed to update verdict');
      }
      deal = data as Record<string, unknown>;
    }

    const extractedMetrics = buildExtractedMetrics(deal as unknown as Record<string, unknown>);
    const finalFinancialDelta = Object.keys(financialDelta).length > 0 ? financialDelta : buildFinancialDelta(deal as unknown as Record<string, unknown>);
    const finalContextMetadata = {
      ...contextMetadata,
      ...(greenFlags.length > 0 ? { green_flags: greenFlags } : {}),
    };

    await supabase.from('training_data').insert({
      deal_id: dealId,
      workspace_id: workspace.id,
      user_id: user.id,
      verdict_type: verdictType,
      searcher_input_text: searcherInputText,
      searcher_rating: searcherRating,
      context_metadata: finalContextMetadata,
      financial_delta: finalFinancialDelta,
      extracted_metrics: extractedMetrics,
      pass_reason_sentence: verdictType === 'pass' ? searcherInputText : null,
    });

    revalidatePath(`/deals/${dealId}`);
    revalidatePath('/dashboard');

    const message = verdictType === 'pass' ? 'Deal marked as passed' : verdictType === 'proceed' ? 'Marked as Proceed' : 'Marked as Park';
    return NextResponse.json({ success: true, message }, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404, headers: corsHeaders });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    console.error('verdict error:', e);
    return NextResponse.json(
      { error: 'Unable to set verdict. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
