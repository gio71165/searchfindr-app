// app/api/capture-deal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { DealsRepository } from "@/lib/data-access/deals";
import { checkRateLimit, getRateLimitConfig } from "@/lib/api/rate-limit";
import { validateInputLength, getCorsHeaders } from "@/lib/api/security";
import { handleApiError } from "@/lib/api/error-handler";
import { withSecurityHeaders } from "@/lib/api/security-middleware";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

const corsHeaders = getCorsHeaders();

// Input length limits
const MAX_TEXT_LENGTH = 50000;
const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 500;

function json(resBody: any, status = 200) {
  return NextResponse.json(resBody, { status, headers: corsHeaders });
}

/**
 * Normalizes any model output to strict A/B/C.
 * Handles: "Tier 1", "Tier 2", "Caution", "Tier A", "B", "C", etc.
 */
function normalizeFinalTier(input: unknown): "A" | "B" | "C" | null {
  if (typeof input !== "string") return null;

  const raw = input.trim();
  if (!raw) return null;

  const s = raw.toUpperCase().replace(/\s+/g, " ").trim();

  // Direct A/B/C
  if (s === "A" || s === "TIER A") return "A";
  if (s === "B" || s === "TIER B") return "B";
  if (s === "C" || s === "TIER C") return "C";

  // Common alternate tier language
  if (s === "TIER 1" || s === "TIER1" || s === "1" || s === "TOP") return "A";
  if (s === "TIER 2" || s === "TIER2" || s === "2" || s === "MEDIUM") return "B";

  // "Caution" and similar should map to C for your A/B/C system
  if (
    s === "CAUTION" ||
    s === "TIER CAUTION" ||
    s === "TIERCAUTION" ||
    s === "RED FLAG" ||
    s === "RED" ||
    s === "AVOID"
  ) {
    return "C";
  }

  // Tier 3 -> C if it shows up
  if (s === "TIER 3" || s === "TIER3" || s === "3" || s === "LOW") return "C";

  return null;
}

// ✅ Normalize red flags into bulleted markdown (string or array)
function coerceRedFlagsToBulletedMarkdown(value: unknown): string | null {
  // Case 1: array of strings
  if (Array.isArray(value)) {
    const items = value
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .map((s) => s.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
      .filter(Boolean);

    if (items.length === 0) return null;
    return items.map((s) => `- ${s}`).join("\n");
  }

  // Case 2: model returns a string blob
  if (typeof value === "string" && value.trim()) {
    const raw = value.replace(/\r\n/g, "\n").trim();

    let parts = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length <= 1) {
      parts = raw
        .split(/(?:\.\s+|;\s+|\n+)/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const items = parts
      .map((s) => s.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
      .filter(Boolean);

    if (items.length === 0) return null;
    return items.map((s) => `- ${s}`).join("\n");
  }

  return null;
}

/**
 * ✅ Data confidence snapshot (companies.ai_confidence_json)
 * This is confidence in the INPUTS / DISCLOSURE QUALITY of the LISTING TEXT,
 * not "how confident the AI feels".
 */
type DataConfidenceLevel = "A" | "B" | "C";

function iconForLevel(level: DataConfidenceLevel): "⚠️" | "◑" | "●" {
  if (level === "A") return "●";
  if (level === "B") return "◑";
  return "⚠️";
}

function safeStr(v: any): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

// Heuristic: on-market listings are usually thin; default is Medium unless clearly thin or clearly detailed.
function buildOnMarketDataConfidence(args: {
  listingText: string;
  ai_summary?: any;
  ai_red_flags?: any;
  financials?: any;
  criteria_match?: any;
}) {
  const listingText = (args.listingText || "").trim();
  const textLen = listingText.length;

  const fin = args.financials && typeof args.financials === "object" ? args.financials : {};
  const revenue = safeStr(fin?.revenue).trim();
  const ebitda = safeStr(fin?.ebitda).trim();
  const margin = safeStr(fin?.margin).trim();
  const conc = safeStr(fin?.customer_concentration).trim();

  const hasAnyFinancial = !!(revenue || ebitda || margin || conc);

  // "Thin listing" checks
  const hasAsking = /\bask(ing)?\b|\basking price\b|\bprice\b|\b\$\s?\d/.test(listingText.toLowerCase());
  const hasLocationHint = /\b[a-z]+,\s?[a-z]{2}\b/i.test(listingText) || /\bstate\b|\bcity\b/i.test(listingText);
  const hasIndustryHint = /\bindustry\b|\bsector\b|\bservice\b|\bmanufactur|\bsaas\b|\bsoftware\b/i.test(
    listingText.toLowerCase()
  );

  // red flags count (string or bullets)
  const red = args.ai_red_flags;
  const redCount = Array.isArray(red)
    ? red.filter((x) => typeof x === "string" && x.trim()).length
    : typeof red === "string" && red.trim()
    ? red.split("\n").filter(Boolean).length
    : 0;

  // Base level selection (B = medium)
  let level: DataConfidenceLevel = "B";

  // If listing is extremely short or missing most useful detail, downgrade to C.
  const thinSignals =
    (textLen > 0 && textLen < 900) || (!hasAnyFinancial && !hasAsking) || (!hasLocationHint && !hasIndustryHint);

  if (thinSignals) level = "C";

  // If listing is long and includes at least some financials, upgrade to A.
  if (textLen >= 2200 && hasAnyFinancial) level = "A";

  // If a lot of red flags exist, it often correlates with messy listing/claims → cap at B.
  if (level === "A" && redCount >= 6) level = "B";

  let summary = "B tier data confidence — listing details require verification.";
  if (level === "C") summary = "C tier data confidence — listing is thin or missing key disclosures.";
  if (level === "A") summary = "A tier data confidence — listing contains meaningful detail and financial context.";

  const signals: Array<{ label: string; value: string }> = [
    { label: "Listing detail", value: textLen >= 2200 ? "Strong" : textLen >= 900 ? "Mixed" : "Thin" },
    { label: "Financial disclosure", value: hasAnyFinancial ? "Present (unverified)" : "Not provided" },
    { label: "Asking / price hints", value: hasAsking ? "Mentioned" : "Not mentioned" },
    { label: "Basic context", value: hasIndustryHint || hasLocationHint ? "Some context" : "Sparse context" },
  ];

  return {
    level,
    icon: iconForLevel(level),
    summary,
    signals,
    source: "on_market",
    updated_at: new Date().toISOString(),
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

async function handlePOST(req: NextRequest) {
  let user: { id: string } | null = null;
  try {
    // Hard fail fast if env is missing (prevents confusing Vercel runtime errors)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return json({ error: "Service temporarily unavailable" }, 500);
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Service temporarily unavailable" }, 500);
    }
    if (!process.env.OPENAI_API_KEY) {
      return json({ error: "Service temporarily unavailable" }, 500);
    }

    /* ===============================
       1) AUTH — Use centralized auth helper
    ================================ */
    const authResult = await authenticateRequest(req);
    const { supabase, user: authUser, workspace } = authResult;
    user = authUser;
    const deals = new DealsRepository(supabase, workspace.id);

    /* ===============================
       2) RATE LIMITING
    ================================ */
    const config = getRateLimitConfig('capture-deal');
    const rateLimit = await checkRateLimit(authUser.id, 'capture-deal', config.limit, config.windowSeconds, supabase);
    if (!rateLimit.allowed) {
      return json({ error: `Rate limit exceeded. Maximum ${config.limit} requests per hour. Please try again later.` }, 429);
    }

    /* ===============================
       3) REQUEST BODY
    ================================ */
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body." }, 400);
    }

    const { url, title, text } = body ?? {};
    if (!url || !text) {
      return json({ error: "Missing url or text." }, 400);
    }

    // Input length validation
    const urlError = validateInputLength(url, MAX_URL_LENGTH, 'URL');
    if (urlError) {
      return json({ error: urlError }, 400);
    }

    const textError = validateInputLength(text, MAX_TEXT_LENGTH, 'Text');
    if (textError) {
      return json({ error: textError }, 400);
    }

    if (title) {
      const titleError = validateInputLength(title, MAX_TITLE_LENGTH, 'Title');
      if (titleError) {
        return json({ error: titleError }, 400);
      }
    }

    const company_name = title || null;

    /* ===============================
       4) OPENAI PROMPT (STRICT A/B/C)
    ================================ */
    const prompt =
      "============================================================\n" +
      "ROLE DEFINITION (MANDATORY)\n" +
      "============================================================\n" +
      "You are an experienced search fund operator with 15+ years in small business M&A.\n" +
      "You specialize in analyzing businesses with $1M-$10M EBITDA.\n" +
      "You have closed 50+ deals and know exactly what red flags to look for.\n\n" +
      "CONTEXT: This is for a search fund operator (not PE, not strategic buyer).\n" +
      "They are looking for a single platform company to acquire and operate.\n" +
      "Deal size: typically $2-10M EBITDA, $5-30M purchase price.\n" +
      "Financing: typically 70-80% SBA 7(a) debt, 10-20% seller note, 10-20% equity.\n\n" +
      "You are helping a search fund / ETA buyer evaluate a lower middle market deal.\n\n" +
      "Return a JSON object with the following shape EXACTLY.\n" +
      'IMPORTANT: scoring.final_tier MUST be exactly one of: "A", "B", or "C".\n' +
      "Do NOT output Tier 1/Tier 2/Caution or any other labels.\n\n" +
      '{\n' +
      '  "ai_summary": "",\n' +
      '  "ai_red_flags": "",\n' +
      '  "financials": {\n' +
      '    "revenue": "",\n' +
      '    "ebitda": "",\n' +
      '    "margin": "",\n' +
      '    "customer_concentration": ""\n' +
      "  },\n" +
      '  "scoring": {\n' +
      '    "succession_risk": "",\n' +
      '    "succession_risk_reason": "",\n' +
      '    "industry_fit": "",\n' +
      '    "industry_fit_reason": "",\n' +
      '    "geography_fit": "",\n' +
      '    "geography_fit_reason": "",\n' +
      '    "final_tier": "A|B|C",\n' +
      '    "final_tier_reason": ""\n' +
      "  },\n" +
      '  "criteria_match": {\n' +
      '    "deal_size": "",\n' +
      '    "business_model": "",\n' +
      '    "owner_profile": "",\n' +
      '    "notes_for_searcher": ""\n' +
      "  },\n" +
      '  "location_city": "",\n' +
      '  "location_state": "",\n' +
      '  "industry": ""\n' +
      "}\n\n" +
      "Company:\n- Name: " +
      (company_name || "") +
      "\n- URL: " +
      url +
      "\n\n" +
      'Listing:\n"""' +
      text +
      '"""\n';

    /* ===============================
       5) OPENAI CALL
    ================================ */
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an experienced search fund operator with 15+ years in small business M&A, specializing in $1M-$10M EBITDA deals." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      logger.error('OpenAI API error in capture-deal:', errText);
      return json({ error: "Failed to process deal. Please try again later." }, 500);
    }

    const aiJSON = await aiResponse.json();

    // Defensive parsing: avoid crashes if the model returns something unexpected
    let parsed: any = null;
    try {
      parsed = JSON.parse(aiJSON?.choices?.[0]?.message?.content ?? "{}");
    } catch {
      return json({ error: "Model returned invalid JSON." }, 500);
    }

    const {
      ai_summary,
      ai_red_flags,
      financials,
      scoring,
      criteria_match,
      location_city,
      location_state,
      industry,
    } = parsed ?? {};

    // ✅ Normalize tier output to A/B/C no matter what the model says
    const normalizedTier = normalizeFinalTier(scoring?.final_tier);

    // Keep score mapping if you still use it elsewhere; otherwise it will remain null.
    let score: number | null = null;
    if (normalizedTier === "A") score = 85;
    else if (normalizedTier === "B") score = 75;
    else if (normalizedTier === "C") score = 65;

    // Also overwrite the scoring JSON tier field so downstream reads stay consistent
    const scoringToStore =
      scoring && typeof scoring === "object"
        ? { ...scoring, final_tier: normalizedTier }
        : { final_tier: normalizedTier };

    // ✅ Normalize red flags to bulleted markdown for consistent UI
    const redFlagsBulleted = coerceRedFlagsToBulletedMarkdown(ai_red_flags);

    // ✅ NEW: data confidence snapshot for dashboard/deal
    const onMarketDataConfidence = buildOnMarketDataConfidence({
      listingText: String(text || ""),
      ai_summary,
      ai_red_flags,
      financials,
      criteria_match,
    });

    /* ===============================
       6) INSERT COMPANY
    ================================ */
    const inserted = await deals.create({
      user_id: authUser.id,
      company_name,
      listing_url: url,
      raw_listing_text: text,
      source_type: "on_market",
      location_city: location_city ?? null,
      location_state: location_state ?? null,
      industry: industry ?? null,
      final_tier: normalizedTier ?? null,
      score,
      ai_summary: ai_summary ?? null,
      ai_red_flags: redFlagsBulleted ?? null,
      ai_financials_json: financials ?? null,
      ai_scoring_json: scoringToStore ?? null,
      criteria_match_json: criteria_match ?? null,
      // ✅ IMPORTANT: this powers your dashboard "Data confidence"
      ai_confidence_json: onMarketDataConfidence,
    });

    // Build deal URL for extension to navigate to
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://searchfindr-app.vercel.app';
    const dealUrl = inserted?.id ? `${baseUrl}/deals/${inserted.id}` : null;

    return json(
      {
        success: true,
        companyId: inserted?.id ?? null,
        dealUrl,
        final_tier: normalizedTier,
        ai_confidence_json: onMarketDataConfidence,
      },
      200
    );
  } catch (err: any) {
    if (err instanceof AuthError) {
      return json({ error: "Authentication failed. Please check your credentials." }, err.statusCode);
    }
    return handleApiError(err, { endpoint: "capture-deal", userId: user?.id });
  }
}

// Export with security headers
export const POST = withSecurityHeaders(handlePOST);
