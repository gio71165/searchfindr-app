// app/api/deals/[id]/pass/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { DealsRepository } from "@/lib/data-access/deals";
import { NotFoundError, DatabaseError } from "@/lib/data-access/base";
import { getCorsHeaders } from "@/lib/api/security";

export const runtime = "nodejs";

const corsHeaders = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * POST /api/deals/[id]/pass
 * Marks a deal as passed (sets passed_at timestamp, stage, and reason)
 * Body: { pass_reason: string, pass_notes?: string | null }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params;
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    if (!dealId) {
      return NextResponse.json({ error: "Missing deal ID" }, { status: 400, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const passReason = body.pass_reason;
    const passNotes = body.pass_notes || null;

    if (!passReason || typeof passReason !== 'string') {
      return NextResponse.json({ error: "pass_reason is required" }, { status: 400, headers: corsHeaders });
    }

    await deals.passDeal(dealId, passReason, passNotes);

    return NextResponse.json({ success: true, message: "Deal marked as passed" }, { status: 200, headers: corsHeaders });
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
    console.error("pass-deal error:", e);
    return NextResponse.json(
      { error: "Unable to mark deal as passed. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}
