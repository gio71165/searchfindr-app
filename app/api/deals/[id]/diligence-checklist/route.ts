// app/api/deals/[id]/diligence-checklist/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { DealsRepository } from "@/lib/data-access/deals";
import { NotFoundError, DatabaseError } from "@/lib/data-access/base";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NODE_ENV === "production"
    ? "https://searchfindr-app.vercel.app"
    : "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * GET /api/deals/[id]/diligence-checklist
 * Returns the diligence checklist state for a deal
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params;
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    const dealId = params.id;
    if (!dealId) {
      return NextResponse.json({ error: "Missing deal ID" }, { status: 400, headers: corsHeaders });
    }

    const checklist = await deals.getDiligenceChecklist(dealId);

    return NextResponse.json({ checklist }, { status: 200, headers: corsHeaders });
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
    console.error("diligence-checklist GET error:", e);
    return NextResponse.json(
      { error: "Unable to load checklist. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/deals/[id]/diligence-checklist
 * Updates the diligence checklist state for a deal
 */
export async function PUT(
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.checklist) {
      return NextResponse.json(
        { error: "Missing or invalid checklist in request body" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate checklist structure
    const checklist = body.checklist;
    if (typeof checklist !== "object" || Array.isArray(checklist)) {
      return NextResponse.json(
        { error: "Checklist must be an object with item keys" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate each checklist item
    for (const [key, value] of Object.entries(checklist)) {
      if (!value || typeof value !== "object" || !('checked' in value) || typeof (value as { checked?: unknown }).checked !== "boolean") {
        return NextResponse.json(
          { error: `Invalid checklist item format for key: ${key}. Each item must have { checked: boolean, notes?: string }` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    await deals.updateDiligenceChecklist(dealId, checklist);

    return NextResponse.json({ success: true, checklist }, { status: 200, headers: corsHeaders });
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
    console.error("diligence-checklist GET error:", e);
    return NextResponse.json(
      { error: "Unable to load checklist. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}
