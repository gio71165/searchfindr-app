// app/api/on-market/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Maps our display bands to numeric ranges (representative overlap logic)
function bandToRange(kind: "revenue" | "ebitda", band: string): { min: number; max: number } | null {
  const b = band.trim();

  if (kind === "revenue") {
    if (b === "<$1M") return { min: 0, max: 999_999 };
    if (b === "$1–5M" || b === "$1-5M") return { min: 1_000_000, max: 4_999_999 };
    if (b === "$5–10M" || b === "$5-10M") return { min: 5_000_000, max: 9_999_999 };
    if (b === "$10–25M" || b === "$10-25M") return { min: 10_000_000, max: 24_999_999 };
    if (b === "$25–50M" || b === "$25-50M") return { min: 25_000_000, max: 49_999_999 };
    if (b === "$50M+") return { min: 50_000_000, max: 10_000_000_000 };
  }

  if (kind === "ebitda") {
    if (b === "<$250K") return { min: 0, max: 249_999 };
    if (b === "$250–500K" || b === "$250-500K") return { min: 250_000, max: 499_999 };
    if (b === "$500K–$1M" || b === "$500K-$1M") return { min: 500_000, max: 999_999 };
    if (b === "$1–2.5M" || b === "$1-2.5M") return { min: 1_000_000, max: 2_499_999 };
    if (b === "$2.5–5M" || b === "$2.5-5M") return { min: 2_500_000, max: 4_999_999 };
    if (b === "$5M+") return { min: 5_000_000, max: 10_000_000_000 };
  }

  return null;
}

function parseBool(v: string | null, defaultVal: boolean) {
  if (v === null || v === undefined) return defaultVal;
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return defaultVal;
}

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
    }

    // ✅ Service role (server only). Do NOT rely on RLS for global inventory.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const sp = req.nextUrl.searchParams;

    // Filters
    const industries = sp.getAll("industry"); // ?industry=HVAC&industry=Plumbing
    const state = sp.get("state"); // e.g. TX (optional)
    const includeUnknownLocation = parseBool(sp.get("include_unknown_location"), true);

    const revenueBand = sp.get("revenue_band");
    const ebitdaBand = sp.get("ebitda_band");
    const includeUnknownFinancials = parseBool(sp.get("include_unknown_financials"), true);

    // Pagination
    const limit = Math.min(Math.max(Number(sp.get("limit") ?? 25), 1), 50);
    const offset = Math.max(Number(sp.get("offset") ?? 0), 0);

    // Sort
    const sort = (sp.get("sort") ?? "freshness").toLowerCase(); // "freshness" | "confidence"

    let q = supabase
      .from("on_market_deals")
      .select(
        [
          "id",
          "company_name",
          "headline",
          "industry_tag",
          "industry_confidence",
          "location_city",
          "location_state",
          "revenue_min",
          "revenue_max",
          "ebitda_min",
          "ebitda_max",
          "revenue_band",
          "ebitda_band",
          "asking_price",
          "deal_type",
          "has_teaser_pdf",
          "source_name",
          "source_url",
          "data_confidence",
          "confidence_score",
          "first_seen_at",
          "last_seen_at",
          "published_at",
          "is_new_today",
          "promoted_date",
        ].join(",")
      )
      // ✅ "Promoted" = promoted_date IS NOT NULL
      .not("promoted_date", "is", null);

    // Industry filter
    if (industries.length > 0) q = q.in("industry_tag", industries);

    // Geo filter (with optional include unknown location)
    if (state) {
      const s = state.toUpperCase();
      if (includeUnknownLocation) {
        q = q.or(`location_state.eq.${s},location_state.is.null`);
      } else {
        q = q.eq("location_state", s);
      }
    }

    // Revenue band filter
    if (revenueBand) {
      const r = bandToRange("revenue", revenueBand);
      if (r) {
        if (includeUnknownFinancials) {
          q = q.or(
            [
              "revenue_min.is.null,revenue_max.is.null",
              `and(revenue_max.gte.${r.min},revenue_min.lte.${r.max})`,
              `and(revenue_min.is.null,revenue_max.gte.${r.min})`,
              `and(revenue_max.is.null,revenue_min.lte.${r.max})`,
            ].join(",")
          );
        } else {
          q = q.or(
            [
              `and(revenue_max.gte.${r.min},revenue_min.lte.${r.max})`,
              `and(revenue_min.is.null,revenue_max.gte.${r.min})`,
              `and(revenue_max.is.null,revenue_min.lte.${r.max})`,
            ].join(",")
          );
        }
      }
    }

    // EBITDA band filter
    if (ebitdaBand) {
      const r = bandToRange("ebitda", ebitdaBand);
      if (r) {
        if (includeUnknownFinancials) {
          q = q.or(
            [
              "ebitda_min.is.null,ebitda_max.is.null",
              `and(ebitda_max.gte.${r.min},ebitda_min.lte.${r.max})`,
              `and(ebitda_min.is.null,ebitda_max.gte.${r.min})`,
              `and(ebitda_max.is.null,ebitda_min.lte.${r.max})`,
            ].join(",")
          );
        } else {
          q = q.or(
            [
              `and(ebitda_max.gte.${r.min},ebitda_min.lte.${r.max})`,
              `and(ebitda_min.is.null,ebitda_max.gte.${r.min})`,
              `and(ebitda_max.is.null,ebitda_min.lte.${r.max})`,
            ].join(",")
          );
        }
      }
    }

    // Sorting
    if (sort === "confidence") {
      q = q.order("confidence_score", { ascending: false }).order("last_seen_at", { ascending: false });
    } else {
      q = q.order("last_seen_at", { ascending: false }).order("confidence_score", { ascending: false });
    }

    // Pagination
    q = q.range(offset, offset + limit - 1);

    const { data, error } = await q;
    if (error) return json(400, { error: error.message });

    return json(200, {
      ok: true,
      limit,
      offset,
      count: data?.length ?? 0,
      deals: data ?? [],
    });
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) });
  }
}
