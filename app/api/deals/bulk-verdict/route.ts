import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { buildExtractedMetrics, buildFinancialDelta } from '@/lib/data-access/training-data';
import { DatabaseError, NotFoundError } from '@/lib/data-access/base';
import { getCorsHeaders } from '@/lib/api/security';
import { logAudit } from '@/lib/api/audit';

export const runtime = 'nodejs';

const corsHeaders = getCorsHeaders();

type BulkVerdictType = 'proceed' | 'park';

/**
 * POST /api/deals/bulk-verdict
 * Set verdict (proceed or park) for multiple deals.
 * Body: { dealIds: string[], verdict_type: 'proceed' | 'park', searcher_input_text?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, workspace, user } = await authenticateRequest(req);
    const dealsRepo = new DealsRepository(supabase, workspace.id);

    const body = await req.json().catch(() => ({}));
    const dealIds = Array.isArray(body?.dealIds) ? body.dealIds : [];
    const verdictType = (body?.verdict_type as BulkVerdictType) || 'proceed';
    const searcherInputText =
      typeof body?.searcher_input_text === 'string'
        ? body.searcher_input_text.trim()
        : verdictType === 'proceed'
          ? 'Bulk proceed'
          : 'Bulk park';

    if (dealIds.length === 0) {
      return NextResponse.json({ error: 'No deal IDs provided' }, { status: 400, headers: corsHeaders });
    }
    if (!['proceed', 'park'].includes(verdictType)) {
      return NextResponse.json({ error: 'verdict_type must be proceed or park' }, { status: 400, headers: corsHeaders });
    }

    const now = new Date().toISOString();
    let updatedCount = 0;

    for (const dealId of dealIds) {
      try {
        const deal = await dealsRepo.getById(dealId);
        await supabase
          .from('companies')
          .update({ verdict: verdictType, last_action_at: now })
          .eq('id', dealId)
          .eq('workspace_id', workspace.id);

        const extractedMetrics = buildExtractedMetrics(deal as unknown as Record<string, unknown>);
        const financialDelta = buildFinancialDelta(deal as unknown as Record<string, unknown>);

        await supabase.from('training_data').insert({
          deal_id: dealId,
          workspace_id: workspace.id,
          user_id: user.id,
          verdict_type: verdictType,
          searcher_input_text: searcherInputText,
          context_metadata: {},
          financial_delta: financialDelta,
          extracted_metrics: extractedMetrics,
        });

        await logAudit(supabase, {
          workspace_id: workspace.id,
          user_id: user.id,
          action: 'verdict_set',
          resource_type: 'deal',
          resource_id: dealId,
          metadata: { verdict_type: verdictType, bulk: true },
        });

        updatedCount++;
      } catch (err) {
        if (err instanceof NotFoundError) continue;
        console.error(`Bulk verdict failed for deal ${dealId}:`, err);
      }
    }

    revalidatePath('/dashboard');

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: dealIds.length,
      verdict_type: verdictType,
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: e.message }, { status: 500, headers: corsHeaders });
    }
    console.error('Bulk verdict error:', e);
    return NextResponse.json(
      { error: 'Failed to update verdicts' },
      { status: 500, headers: corsHeaders }
    );
  }
}
