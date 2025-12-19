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
    // (If your UI is showing "Tier 1 / Tier 2 / Caution", the root problem is tier labels,
    //  not the numeric score.)
    let score: number | null = null;
    if (normalizedTier === "A") score = 85;
    else if (normalizedTier === "B") score = 75;
    else if (normalizedTier === "C") score = 65;

    // Also overwrite the scoring JSON tier field so downstream reads stay consistent
    const scoringToStore =
      scoring && typeof scoring === "object"
        ? { ...scoring, final_tier: normalizedTier }
        : { final_tier: normalizedTier };

    /* ===============================
       6) INSERT COMPANY
    ================================ */
    const { error: insertError } = await supabaseAdmin.from("companies").insert({
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
      ai_red_flags: ai_red_flags ?? null,
      ai_financials_json: financials ?? null,
      ai_scoring_json: scoringToStore ?? null,
      criteria_match_json: criteria_match ?? null,
    });

    if (insertError) {
      return json({ error: insertError.message }, 500);
    }

    return json({ success: true }, 200);
  } catch (err: any) {
    return json({ error: err?.message || "Unknown error" }, 500);
  }
}
