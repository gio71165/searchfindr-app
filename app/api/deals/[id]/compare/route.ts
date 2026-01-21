// app/api/deals/[id]/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { DealsRepository } from "@/lib/data-access/deals";
import { NotFoundError } from "@/lib/data-access/base";
import { getCorsHeaders } from "@/lib/api/security";

export const runtime = "nodejs";

const corsHeaders = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * GET /api/deals/[id]/compare
 * Returns comparison data for a deal against recent deals in the same workspace
 */
export async function GET(
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

    // Get the current deal
    const currentDeal = await deals.getById(dealId);

    // Get recent deals from the same workspace (excluding current deal and archived deals)
    const { data: recentDeals, error } = await supabase
      .from("companies")
      .select("*")
      .eq("workspace_id", workspace.id)
      .neq("id", dealId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(20); // Get more than needed to allow filtering

    if (error) {
      console.error("Error fetching comparison deals:", error);
      return NextResponse.json(
        { error: "Failed to fetch comparison deals" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Format comparison data
    const comparisonData = {
      current_deal: {
        id: currentDeal.id,
        company_name: currentDeal.company_name || "Untitled Company",
        industry: currentDeal.industry || null,
        location: [currentDeal.location_city, currentDeal.location_state]
          .filter(Boolean)
          .join(", ") || null,
        revenue: extractRevenue(currentDeal),
        ebitda: extractEBITDA(currentDeal),
        tier: currentDeal.final_tier || null,
        created_at: currentDeal.created_at,
        source_type: currentDeal.source_type,
      },
      comparison_deals: (recentDeals || []).slice(0, 10).map((deal) => ({
        id: deal.id,
        company_name: deal.company_name || "Untitled Company",
        industry: deal.industry || null,
        location: [deal.location_city, deal.location_state]
          .filter(Boolean)
          .join(", ") || null,
        revenue: extractRevenue(deal),
        ebitda: extractEBITDA(deal),
        tier: deal.final_tier || null,
        created_at: deal.created_at,
        source_type: deal.source_type,
      })),
    };

    return NextResponse.json(comparisonData, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404, headers: corsHeaders });
    }
    console.error("compare-deal error:", e);
    return NextResponse.json(
      { error: "Unable to fetch comparison data. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Extract revenue from deal (from various sources)
 */
function extractRevenue(deal: any): string | null {
  // Try extracted revenue first
  if (deal.revenue_ttm_extracted) {
    return deal.revenue_ttm_extracted;
  }

  // Try from criteria_match_json
  if (deal.criteria_match_json?.ebitda_ttm) {
    return deal.criteria_match_json.ebitda_ttm;
  }

  // Try from ai_financials_json
  const finJson = deal.ai_financials_json;
  if (finJson) {
    if (typeof finJson.revenue === "string") {
      return finJson.revenue;
    }
    if (Array.isArray(finJson.revenue) && finJson.revenue.length > 0) {
      const entry = finJson.revenue[0];
      if (entry?.value) {
        return `${entry.value} ${entry.unit || ""}`.trim();
      }
    }
  }

  return null;
}

/**
 * Extract EBITDA from deal (from various sources)
 */
function extractEBITDA(deal: any): string | null {
  // Try extracted EBITDA first
  if (deal.ebitda_ttm_extracted) {
    return deal.ebitda_ttm_extracted;
  }

  // Try from criteria_match_json
  if (deal.criteria_match_json?.ebitda_ttm) {
    return deal.criteria_match_json.ebitda_ttm;
  }

  // Try from ai_financials_json
  const finJson = deal.ai_financials_json;
  if (finJson) {
    if (typeof finJson.ebitda === "string") {
      return finJson.ebitda;
    }
    if (Array.isArray(finJson.ebitda) && finJson.ebitda.length > 0) {
      const entry = finJson.ebitda[0];
      if (entry?.value) {
        return `${entry.value} ${entry.unit || ""}`.trim();
      }
    }
  }

  return null;
}
