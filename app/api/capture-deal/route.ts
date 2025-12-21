// app/api/capture-deal/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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
type DataConfidenceLevel = "low" | "medium" | "high";

function iconForLevel(level: DataConfidenceLevel): "⚠️" | "◑" | "●" {
  if (level === "high") return "●";
  if (level === "medium") return "◑";
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

  // Base level selection
  let level: DataConfidenceLevel = "medium";

  // If listing is extremely short or missing most useful detail, downgrade to low.
  const thinSignals =
    (textLen > 0 && textLen < 900) || (!hasAnyFinancial && !hasAsking) || (!hasLocationHint && !hasIndustryHint);

  if (thinSignals) level = "low";

  // If listing is long and includes at least some financials, upgrade to high.
  if (textLen >= 2200 && hasAnyFinancial) level = "high";

  // If a lot of red flags exist, it often correlates with messy listing/claims → cap at medium.
  if (level === "high" && redCount >= 6) level = "medium";

  let summary = "Medium data confidence — listing details require verification.";
  if (level === "low") summary = "Low data confidence — listing is thin or missing key disclosures.";
  if (level === "high") summary = "High data confidence — listing contains meaningful detail and financial context.";

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

export async function POST(req: Request) {
  try {
    // Hard fail fast if env is missing (prevents confusing Vercel runtime errors)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, 500);
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }
    if (!process.env.OPENAI_API_KEY) {
      return json({ error: "Missing OPENAI_API_KEY" }, 500);
    }

    /* ===============================
       1) AUTH — Supabase Bearer Token
    ================================ */
    const authHeader = req.headers.get("authorization");
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) {
      return json({ error: "Missing Authorization Bearer token." }, 401);
    }

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      return json({ error: "Invalid or expired token." }, 401);
    }

    const ownerUserId = userData.user.id;

    /* ===============================
       2) RESOLVE WORKSPACE
    ================================ */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("workspace_id")
      .eq("id", ownerUserId)
      .single();

    if (profileError || !profile?.workspace_id) {
      return json({ error: "Workspace not found for user." }, 400);
    }

    const workspaceId = profile.workspace_id;

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

    const company_name = title || null;

    /* ===============================
       4) OPENAI PROMPT (STRICT A/B/C)
    ================================ */
    const prompt =
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
          { role: "system", content: "You are a precise M&A analyst for search funds." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return json({ error: errText }, 500);
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
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("companies")
      .insert({
        workspace_id: workspaceId,
        user_id: ownerUserId,
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
      })
      .select("id")
      .single();

    if (insertError) {
      return json({ error: insertError.message }, 500);
    }

    return json(
      {
        success: true,
        companyId: inserted?.id ?? null,
        final_tier: normalizedTier,
        ai_confidence_json: onMarketDataConfidence,
      },
      200
    );
  } catch (err: any) {
    return json({ error: err?.message || "Unknown error" }, 500);
  }
}
