// app/api/off-market/diligence/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type Body = {
  // your client sends these:
  companyId?: string;
  website?: string | null;
  force?: boolean;

  // allow other shapes too:
  company_id?: string;
  id?: string;
};

function toTextSafe(v: any) {
  return typeof v === "string" ? v : "";
}

function stripHtmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// V1: homepage only (no crawling)
async function fetchHomepageText(urlStr: string) {
  try {
    const res = await fetch(urlStr, {
      redirect: "follow",
      headers: {
        "User-Agent": "SearchFindrBot/1.0 (+https://searchfindr.local)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) return "";
    const html = await res.text();
    const text = stripHtmlToText(html);
    return text.slice(0, 9000);
  } catch {
    return "";
  }
}

async function getAuthedUserAndWorkspace(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return { userId: null as string | null, workspaceId: null as string | null };

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user?.id) return { userId: null, workspaceId: null };

  const userId = userData.user.id;

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", userId)
    .single();

  if (profErr || !profile?.workspace_id) return { userId, workspaceId: null };

  return { userId, workspaceId: profile.workspace_id as string };
}

/**
 * IMPORTANT CHANGES vs your old version:
 * - No "geography fit" or "industry fit" fluff.
 * - Tier/score MUST be justified by evidence. If ownership cannot be verified => cap tier/score.
 * - Always return business_model / owner_profile / notes_for_searcher.
 */
async function runOffMarketInitialDiligenceAI(input: {
  company: {
    company_name: string | null;
    website: string;
    address: string | null;
    phone: string | null;
    rating: number | null;
    ratings_total: number | null;
    tier_reason: any | null; // may include inputs from search route
  };
  homepageText: string;
}) {
  const c = input.company;

  // Pull original search criteria if you stored it in tier_reason.inputs during off-market/search
  const inputs =
    c.tier_reason && typeof c.tier_reason === "object" ? (c.tier_reason as any).inputs ?? null : null;

  const prompt = `
You are SearchFindr running INITIAL OFF-MARKET DILIGENCE using ONLY:
- Google listing metadata we already have (rating/reviews/address/phone)
- The company website homepage text pasted below (may be incomplete)

Do NOT assume you know the owner. If the website DOES NOT explicitly show ownership signals
(e.g., "owner", "founder", named people with titles, "family-owned" with specifics),
then owner information is "Unknown".

Very important: Tier and score MUST be EVIDENCE-BASED.
- If ownership cannot be verified (no named owner/founder/leadership signals), you MUST cap the result:
  - final_tier cannot be "A"
  - overall_score_0_100 must be <= 69
- If the website text is thin/marketing-only and doesn't show real operations, be conservative.

Do NOT include geography/industry fit scoring. Those are redundant because the user searched here.

Return ONLY valid JSON (no markdown) in this exact schema:

{
  "ai_summary": "string (2-4 sentences, factual, no hype)",
  "ai_red_flags": ["string (specific, actionable)"],
  "business_model": {
    "services": ["string"],
    "customer_types": ["string"],
    "delivery_model": "string (how work is delivered: crews, field service, recurring contracts, etc.)",
    "recurring_revenue_signals": ["string"],
    "differentiators": ["string"],
    "evidence": ["string (directly derived from website text)"]
  },
  "owner_profile": {
    "known": boolean,
    "owner_names": ["string"],
    "ownership_type": "Unknown|Owner-operated|Family-owned|Partnership|Other",
    "evidence": ["string (directly derived from website text)"],
    "assumptions": ["string (ONLY if you must infer; keep short)"]
  },
  "notes_for_searcher": {
    "what_to_verify_first": ["string (next steps to validate)"],
    "questions_to_ask_owner": ["string"],
    "deal_angle": ["string (why this could be attractive IF confirmed)"]
  },
  "financials": {
    "revenue_band_est": "Unknown|<$1M|$1–$3M|$3–$10M|$10M+",
    "ebitda_band_est": "Unknown|<$250k|$250k–$750k|$750k–$2M|$2M+",
    "pricing_power": "Low|Medium|High|Unknown",
    "customer_concentration_risk": "Low|Medium|High|Unknown",
    "seasonality_risk": "Low|Medium|High|Unknown",
    "evidence": ["string (why you chose these)"]
  },
  "scoring": {
    "succession_risk": "Low|Medium|High|Unknown",
    "operational_quality_signal": "Low|Medium|High|Unknown",
    "data_confidence": "Low|Medium|High",
    "overall_score_0_100": 0,
    "final_tier": "A|B|C",
    "tier_basis": "string (1 sentence explaining tier in plain English)"
  },
  "criteria_match": {
    "business_model": "string (short summary for UI)",
    "owner_profile": "string (short summary for UI)",
    "notes_for_searcher": "string (short summary for UI)",
    "source_inputs": ${inputs ? JSON.stringify(inputs) : "null"}
  }
}

Company metadata:
- Name: ${c.company_name ?? ""}
- Website: ${c.website}
- Address: ${c.address ?? ""}
- Phone: ${c.phone ?? ""}
- Google rating: ${c.rating ?? ""}
- Ratings count: ${c.ratings_total ?? ""}

Homepage text:
${input.homepageText || "(no homepage text available)"}
`.trim();

  const res = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    const msg = json?.error?.message || "OpenAI error";
    throw new Error(msg);
  }

  const contentRaw = json?.choices?.[0]?.message?.content ?? "";
  const content = contentRaw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(content);

  // ---- hard validations + guardrails ----
  if (typeof parsed?.ai_summary !== "string") throw new Error("Bad AI response: ai_summary missing");

  if (!Array.isArray(parsed?.ai_red_flags)) parsed.ai_red_flags = [];

  // Ensure the UI fields exist
  if (!parsed?.business_model || typeof parsed.business_model !== "object") {
    parsed.business_model = {
      services: [],
      customer_types: [],
      delivery_model: "Unknown",
      recurring_revenue_signals: [],
      differentiators: [],
      evidence: [],
    };
  }
  if (!parsed?.owner_profile || typeof parsed.owner_profile !== "object") {
    parsed.owner_profile = {
      known: false,
      owner_names: [],
      ownership_type: "Unknown",
      evidence: [],
      assumptions: [],
    };
  }
  if (!parsed?.notes_for_searcher || typeof parsed.notes_for_searcher !== "object") {
    parsed.notes_for_searcher = {
      what_to_verify_first: [],
      questions_to_ask_owner: [],
      deal_angle: [],
    };
  }

  if (!parsed?.financials || typeof parsed.financials !== "object") parsed.financials = {};
  if (!Array.isArray(parsed?.financials?.evidence)) parsed.financials.evidence = [];

  if (!parsed?.scoring || typeof parsed.scoring !== "object") parsed.scoring = {};
  if (!["A", "B", "C"].includes(parsed?.scoring?.final_tier)) parsed.scoring.final_tier = "C";

  const scoreNum = Number(parsed?.scoring?.overall_score_0_100);
  parsed.scoring.overall_score_0_100 = Number.isFinite(scoreNum) ? scoreNum : 0;

  // GUARDRail: If owner unknown => no A, score <= 69
  const ownerKnown = Boolean(parsed?.owner_profile?.known);
  if (!ownerKnown) {
    if (parsed.scoring.final_tier === "A") parsed.scoring.final_tier = "B";
    if (parsed.scoring.overall_score_0_100 > 69) parsed.scoring.overall_score_0_100 = 69;
    if (typeof parsed.scoring.tier_basis !== "string" || !parsed.scoring.tier_basis.trim()) {
      parsed.scoring.tier_basis =
        "Tier is capped because ownership could not be verified from the website text.";
    }
  }

  // Ensure criteria_match contains the UI summaries (never blank)
  if (!parsed?.criteria_match || typeof parsed.criteria_match !== "object") parsed.criteria_match = {};
  parsed.criteria_match.business_model =
    typeof parsed.criteria_match.business_model === "string" && parsed.criteria_match.business_model.trim()
      ? parsed.criteria_match.business_model
      : `Services: ${(parsed.business_model.services ?? []).slice(0, 4).join(", ") || "Unknown"}.`;

  parsed.criteria_match.owner_profile =
    typeof parsed.criteria_match.owner_profile === "string" && parsed.criteria_match.owner_profile.trim()
      ? parsed.criteria_match.owner_profile
      : ownerKnown
      ? `Owner/leadership identified: ${(parsed.owner_profile.owner_names ?? []).join(", ") || "Yes"}.`
      : "Owner not identified on website; treat as unknown until verified.";

  parsed.criteria_match.notes_for_searcher =
    typeof parsed.criteria_match.notes_for_searcher === "string" && parsed.criteria_match.notes_for_searcher.trim()
      ? parsed.criteria_match.notes_for_searcher
      : `Verify: ${((parsed.notes_for_searcher.what_to_verify_first ?? []) as string[]).slice(0, 3).join(" • ") || "contracts, team size, recurring revenue"}.`;

  return parsed as {
    ai_summary: string;
    ai_red_flags: string[];
    business_model: any;
    owner_profile: any;
    notes_for_searcher: any;
    financials: any;
    scoring: any;
    criteria_match: any;
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: "Missing Supabase env vars" },
        { status: 500, headers: corsHeaders }
      );
    }
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Missing OPENAI_API_KEY" },
        { status: 500, headers: corsHeaders }
      );
    }

    const { workspaceId } = await getAuthedUserAndWorkspace(req);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = (await req.json()) as Body;

    const companyId =
      toTextSafe(body?.companyId).trim() ||
      toTextSafe(body?.company_id).trim() ||
      toTextSafe(body?.id).trim();

    if (!companyId) {
      return NextResponse.json({ success: false, error: "Missing company_id" }, { status: 400, headers: corsHeaders });
    }

    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .select(
        [
          "id",
          "workspace_id",
          "source_type",
          "company_name",
          "website",
          "address",
          "phone",
          "rating",
          "ratings_total",
          "tier_reason",
        ].join(",")
      )
      .eq("id", companyId)
      .eq("workspace_id", workspaceId)
      .single();

    if (companyErr || !company) {
      return NextResponse.json(
        { success: false, error: "Company not found (or not in your workspace)" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (company.source_type !== "off_market") {
      return NextResponse.json(
        { success: false, error: "Initial diligence (off-market) can only run for off-market companies." },
        { status: 400, headers: corsHeaders }
      );
    }

    const websiteFromBody = toTextSafe(body?.website).trim();
    const websiteFromDb = toTextSafe(company.website).trim();
    const website = websiteFromBody || websiteFromDb;

    if (!website) {
      return NextResponse.json(
        { success: false, error: "Missing website for this off-market company. Add a website before running diligence." },
        { status: 400, headers: corsHeaders }
      );
    }

    const homepageText = await fetchHomepageText(website);

    const ai = await runOffMarketInitialDiligenceAI({
      company: {
        company_name: company.company_name ?? null,
        website,
        address: company.address ?? null,
        phone: company.phone ?? null,
        rating: company.rating ?? null,
        ratings_total: company.ratings_total ?? null,
        tier_reason: company.tier_reason ?? null,
      },
      homepageText,
    });

    // Return exactly what your client expects to save into the companies row
    return NextResponse.json(
      {
        success: true,
        ai_summary: ai.ai_summary,
        ai_red_flags: ai.ai_red_flags,
        financials: ai.financials,
        scoring: ai.scoring,
        criteria_match: ai.criteria_match, // now includes business_model/owner_profile/notes_for_searcher summaries
      },
      { headers: corsHeaders }
    );
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
