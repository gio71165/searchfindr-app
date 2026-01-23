// app/api/deals/[id]/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from 'next/cache';
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
 * POST /api/deals/[id]/delete
 * Permanently deletes a deal.
 * Body: { force?: boolean, confirmation?: string }
 * - force: If true, allows deletion even if not archived
 * - confirmation: Must be "DELETE" if force is true
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
    const force = body.force === true;
    const confirmation = body.confirmation;

    // If force is true, require confirmation to be "DELETE"
    if (force && confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Permanent deletion requires typing 'DELETE' as confirmation" },
        { status: 400, headers: corsHeaders }
      );
    }

    await deals.delete(dealId, force);

    // Revalidate dashboard (deal page no longer exists)
    revalidatePath('/dashboard');

    return NextResponse.json({ success: true, message: "Deal deleted permanently" }, { status: 200, headers: corsHeaders });
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
    console.error("delete-deal error:", e);
    return NextResponse.json(
      { error: "Unable to delete deal. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}
