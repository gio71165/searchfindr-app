// app/api/on-market/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

/**
 * V1: HARD LOCK
 * Only these industries are allowed anywhere in global promoted inventory.
 */
const V1_ALLOWED_INDUSTRIES = ["HVAC", "Plumbing", "Electrical"] as const;
type V1Industry = (typeof V1_ALLOWED_INDUSTRIES)[number];

function isV1Industry(x: unknown): x is V1Industry {
  return typeof x === "string" && (V1_ALLOWED_INDUSTRIES as readonly string[]).includes(x);
}

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

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
  const s = String(v).toLowerCase().trim();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no") return false;
  return defaultVal;
}

/**
 * Parse ?industry=HVAC&industry=Plumbing
 * V1: sanitize to ONLY allowed tags; if caller provides only invalid tags => return 0 results.
 */
function parseIndustries(sp: URLSearchParams): { mode: "default" | "explicit"; industries: V1Industry[] } {
  const raw = sp.getAll("industry").map((x) => String(x).trim());
  if (!raw.length) return { mode: "default", industries: [...V1_ALLOWED_INDUSTRIES] };

  const cleaned = raw.filter(isV1Industry);
  return { mode: "explicit", industries: cleaned };
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
    const { mode: industryMode, industries } = parseIndustries(sp);
    const stateRaw = sp.get("state"); // e.g. TX (optional)
    const state = stateRaw ? String(stateRaw).trim().toUpperCase() : null;

    // ✅ default curated behavior
    const includeUnknownLocation = parseBool(sp.get("include_unknown_location"), false);
    const includeUnknownFinancials = parseBool(sp.get("include_unknown_financials"), false);

    const revenueBand = sp.get("revenue_band");
    const ebitdaBand = sp.get("ebitda_band");

    // Pagination
    const limit = Math.min(Math.max(Number(sp.get("limit") ?? 25), 1), 50);
    const offset = Math.max(Number(sp.get("offset") ?? 0), 0);

    // Sort
    const sort = (sp.get("sort") ?? "confidence").toLowerCase(); // "freshness" | "confidence"

    // If user explicitly passed industries, but ALL were invalid, return empty set (strict).
    if (industryMode === "explicit" && industries.length === 0) {
      return json(200, { ok: true, limit, offset, count: 0, deals: [] });
    }

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
      // ✅ Only promoted inventory
      .not("promoted_date", "is", null)
      // ✅ Only deals we actually classified into your V1 taxonomy
      .in("industry_tag", industries)
      // ✅ Minimum confidence for “premium” defaults
      .gte("industry_confidence", 70);

    // Geo filter (with optional include unknown location)
    if (state) {
      if (includeUnknownLocation) {
        q = q.or(`location_state.eq.${state},location_state.is.null`);
      } else {
        q = q.eq("location_state", state);
      }
    } else {
      if (!includeUnknownLocation) {
        q = q.not("location_state", "is", null);
      }
    }

    // Revenue band filter
    if (revenueBand) {
      const r = bandToRange("revenue", revenueBand);
      if (r) {
        if (includeUnknownFinancials) {
          // ✅ IMPORTANT: both null must be AND(), not comma
          q = q.or(
            [
              "and(revenue_min.is.null,revenue_max.is.null)",
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
          // ✅ IMPORTANT: both null must be AND(), not comma
          q = q.or(
            [
              "and(ebitda_min.is.null,ebitda_max.is.null)",
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
    if (sort === "freshness") {
      q = q.order("last_seen_at", { ascending: false }).order("confidence_score", { ascending: false });
    } else {
      q = q
        .order("industry_confidence", { ascending: false })
        .order("confidence_score", { ascending: false })
        .order("last_seen_at", { ascending: false });
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
