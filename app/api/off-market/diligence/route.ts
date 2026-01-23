// app/api/off-market/diligence/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from 'next/cache';
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { DealsRepository } from "@/lib/data-access/deals";
import { NotFoundError } from "@/lib/data-access/base";
import { buildOffMarketDiligencePrompt } from "@/lib/prompts/off-market-diligence";
import type { DealScoring, DataConfidence, Deal } from "@/lib/types/deal";
import { sanitizeForPrompt, sanitizeShortText } from "@/lib/utils/sanitize";
import { withRetry } from "@/lib/utils/retry";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NODE_ENV === "production"
    ? "https://searchfindr-app.vercel.app"
    : "http://localhost:3000",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type Body = {
  companyId?: string;
  website?: string | null;
  force?: boolean;

  company_id?: string;
  id?: string;
};

function toTextSafe(v: unknown): string {
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
    return sanitizeForPrompt(text, 9000);
  } catch {
    return "";
  }
}

function bullets(value: unknown): string | null {
  if (!value) return null;

  // Array of strings
  if (Array.isArray(value)) {
    const items = value
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .map((s) => s.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
      .filter(Boolean);

    if (!items.length) return null;
    return items.map((s) => `- ${s}`).join("\n");
  }

  // String blob
  if (typeof value === "string" && value.trim()) {
    const raw = value.replace(/\r\n/g, "\n").trim();
    const parts = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
      .filter(Boolean);

    if (!parts.length) return null;
    return parts.map((s) => `- ${s}`).join("\n");
  }

  return null;
}

function clampScore(n: number) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function tierToScore(tier: string | null | undefined): number | null {
  const t = (tier || "").toUpperCase();
  if (t === "A") return 85;
  if (t === "B") return 75;
  if (t === "C") return 65;
  return null;
}

function normalizeDataConfidence(v: unknown): "A" | "B" | "C" | null {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  
  // Direct A/B/C match
  if (s === "A" || s === "TIER A") return "A";
  if (s === "B" || s === "TIER B") return "B";
  if (s === "C" || s === "TIER C") return "C";
  
  // Map old low/medium/high to A/B/C
  const lower = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (lower === "high" || lower.includes("high")) return "A";
  if (lower === "medium" || lower.includes("medium")) return "B";
  if (lower === "low" || lower.includes("low")) return "C";
  
  return null;
}

function confidenceIcon(level: "A" | "B" | "C") {
  return level === "A" ? "●" : level === "B" ? "◑" : "⚠️";
}

function buildOffMarketConfidence(ai: {
  scoring?: {
    data_confidence?: unknown;
    tier_basis?: unknown;
  };
  business_model?: {
    evidence?: unknown[];
  };
  owner_profile?: {
    known?: boolean;
  };
}): {
  level: "A" | "B" | "C";
  icon: "⚠️" | "◑" | "●";
  summary: string;
  signals: { label: string; value: string }[];
  source: "off_market";
  updated_at: string;
} {
  const dc = normalizeDataConfidence(ai?.scoring?.data_confidence) ?? "C";

  const tierBasis = typeof ai?.scoring?.tier_basis === "string" ? ai.scoring.tier_basis.trim() : "";
  const evidenceCount = Array.isArray(ai?.business_model?.evidence) ? ai.business_model.evidence.length : 0;

  let reason = "";
  if (dc === "A") {
    reason = "A tier data confidence — clear services + operational detail visible in available inputs.";
  } else if (dc === "B") {
    reason = "B tier data confidence — some operational detail visible, but key details still need verification.";
  } else {
    reason = "C tier data confidence — limited/marketing-only inputs; major facts require verification.";
  }

  if (tierBasis) {
    const short = tierBasis.length > 140 ? `${tierBasis.slice(0, 140)}…` : tierBasis;
    reason = `${reason} ${short}`;
  }

  const signals: { label: string; value: string }[] = [
    { label: "Inputs", value: "Website homepage + Google listing metadata" },
    { label: "Evidence density", value: evidenceCount >= 4 ? "Stronger" : evidenceCount >= 2 ? "Mixed" : "Thin" },
    { label: "Owner signals", value: ai?.owner_profile?.known ? "Identified" : "Unknown" },
  ];

  return {
    level: dc,
    icon: confidenceIcon(dc),
    summary: reason,
    signals,
    source: "off_market",
    updated_at: new Date().toISOString(),
  };
}


async function runOffMarketInitialDiligenceAI(input: {
  company: {
    company_name: string | null;
    website: string;
    address: string | null;
    phone: string | null;
    rating: number | null;
    ratings_total: number | null;
    tier_reason: Record<string, unknown> | null;
  };
  homepageText: string;
}) {
  const c = input.company;

  const inputs = c.tier_reason && typeof c.tier_reason === "object" && 'inputs' in c.tier_reason 
    ? (c.tier_reason.inputs as Record<string, unknown> | undefined) ?? null 
    : null;

  const prompt = buildOffMarketDiligencePrompt({
    company_name: sanitizeShortText(c.company_name ?? ""),
    website: sanitizeShortText(c.website),
    address: sanitizeShortText(c.address ?? ""),
    phone: sanitizeShortText(c.phone ?? ""),
    rating: c.rating ?? null,
    ratings_total: c.ratings_total ?? null,
    homepageText: input.homepageText || "(no homepage text available)",
    inputs,
  });

  const res = await withRetry(
    () =>
      fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      }),
    { maxRetries: 2, delayMs: 1000 }
  );

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

  const parsed: {
    ai_summary?: string;
    ai_red_flags?: string[];
    business_model?: {
      services?: string[];
      evidence?: unknown[];
    };
    owner_profile?: {
      known?: boolean;
      owner_names?: string[];
    };
    notes_for_searcher?: {
      what_to_verify_first?: string[];
    };
    financials?: Record<string, unknown>;
    scoring?: {
      overall_score_0_100?: unknown;
      final_tier?: string;
      tier_basis?: string;
      data_confidence?: unknown;
    };
    criteria_match?: {
      business_model?: string;
      owner_profile?: string;
      notes_for_searcher?: string;
    };
    decision_framework?: {
      verdict?: string;
      verdict_confidence?: string;
      primary_reason?: string;
      recommended_next_action?: string;
      outreach_priority?: string;
    };
    deal_economics?: {
      asking_price?: string | null;
      revenue_ttm?: string | null;
      ebitda_ttm?: string | null;
      deal_size_band?: string;
      sba_eligible?: {
        assessment?: string;
      };
    };
  } = JSON.parse(content);

  if (typeof parsed?.ai_summary !== "string") throw new Error("Bad AI response: ai_summary missing");

  if (!Array.isArray(parsed?.ai_red_flags)) parsed.ai_red_flags = [];
  while (parsed.ai_red_flags.length < 3) {
    parsed.ai_red_flags.push(
      "Unknown: key risks not visible on homepage. Verify contracts, labor model, and customer concentration."
    );
  }

  if (!parsed?.business_model || typeof parsed.business_model !== "object") parsed.business_model = {};
  if (!parsed?.owner_profile || typeof parsed.owner_profile !== "object") parsed.owner_profile = {};
  if (!parsed?.notes_for_searcher || typeof parsed.notes_for_searcher !== "object") parsed.notes_for_searcher = {};
  if (!parsed?.financials || typeof parsed.financials !== "object") parsed.financials = {};
  if (!parsed?.scoring || typeof parsed.scoring !== "object") parsed.scoring = {};
  if (!parsed?.criteria_match || typeof parsed.criteria_match !== "object") parsed.criteria_match = {};

  const ownerKnown = Boolean(parsed?.owner_profile?.known);
  const scoreNum = typeof parsed?.scoring?.overall_score_0_100 === 'number' 
    ? parsed.scoring.overall_score_0_100 
    : Number(parsed?.scoring?.overall_score_0_100);
  const clampedScore = clampScore(scoreNum);

  let finalTier = parsed?.scoring?.final_tier ?? "";
  if (!["A", "B", "C"].includes(finalTier)) finalTier = "C";

  // Guardrail: owner unknown => no A, score <= 69
  let adjustedScore = clampedScore;
  if (!ownerKnown) {
    if (finalTier === "A") finalTier = "B";
    if (clampedScore > 69) adjustedScore = 69;
    if (typeof parsed.scoring.tier_basis !== "string" || !parsed.scoring.tier_basis.trim()) {
      parsed.scoring.tier_basis = "Tier is capped because ownership could not be verified from the homepage text.";
    }
  }

  const services = Array.isArray(parsed?.business_model?.services) ? parsed.business_model.services : [];

  parsed.criteria_match.business_model =
    typeof parsed.criteria_match.business_model === "string" && parsed.criteria_match.business_model.trim()
      ? parsed.criteria_match.business_model
      : `Services: ${services.slice(0, 4).join(", ") || "Unknown"}.`;

  parsed.criteria_match.owner_profile =
    typeof parsed.criteria_match.owner_profile === "string" && parsed.criteria_match.owner_profile.trim()
      ? parsed.criteria_match.owner_profile
      : ownerKnown
      ? `Owner/leadership identified: ${(parsed?.owner_profile?.owner_names ?? []).join(", ") || "Yes"}.`
      : "Owner not identified on website; treat as unknown until verified.";

  parsed.criteria_match.notes_for_searcher =
    typeof parsed.criteria_match.notes_for_searcher === "string" && parsed.criteria_match.notes_for_searcher.trim()
      ? parsed.criteria_match.notes_for_searcher
      : `Verify: ${((parsed?.notes_for_searcher?.what_to_verify_first ?? []) as string[])
          .slice(0, 3)
          .join(" • ") || "contracts, team size, recurring revenue"}.`;

  // Normalize data_confidence to A/B/C tier
  const normalizedDataConfidence: DataConfidence | undefined = parsed.scoring?.data_confidence 
    ? (typeof parsed.scoring.data_confidence === 'string' 
        ? ((): DataConfidence | undefined => {
            const s = parsed.scoring.data_confidence.toUpperCase();
            if (s === 'A' || s === 'TIER A') return 'A' as DataConfidence;
            if (s === 'B' || s === 'TIER B') return 'B' as DataConfidence;
            if (s === 'C' || s === 'TIER C') return 'C' as DataConfidence;
            // Map old low/medium/high to A/B/C
            const lower = parsed.scoring.data_confidence.toLowerCase();
            if (lower === 'high' || lower.includes('high')) return 'A' as DataConfidence;
            if (lower === 'medium' || lower.includes('medium')) return 'B' as DataConfidence;
            if (lower === 'low' || lower.includes('low')) return 'C' as DataConfidence;
            return undefined;
          })()
        : undefined)
    : undefined;

  const normalizedScoring: DealScoring = {
    ...(parsed.scoring ?? {}),
    overall_score_0_100: adjustedScore,
    final_tier: (finalTier === "A" || finalTier === "B" || finalTier === "C") ? finalTier : undefined,
    data_confidence: normalizedDataConfidence,
    tier_basis: typeof parsed.scoring?.tier_basis === "string" && parsed.scoring.tier_basis.trim()
      ? parsed.scoring.tier_basis
      : (!ownerKnown ? "Tier is capped because ownership could not be verified from the homepage text." : undefined),
  };

  return {
    ai_summary: parsed.ai_summary,
    ai_red_flags: parsed.ai_red_flags,
    financials: parsed.financials ?? {},
    scoring: normalizedScoring,
    criteria_match: parsed.criteria_match ?? {},
    decision_framework: parsed.decision_framework,
    deal_economics: parsed.deal_economics,
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
      return NextResponse.json({ success: false, error: "Missing OPENAI_API_KEY" }, { status: 500, headers: corsHeaders });
    }

    const { supabase: supabaseUser, user, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabaseUser, workspace.id);

    const body = (await req.json()) as Body;

    const companyId =
      toTextSafe(body?.companyId).trim() || toTextSafe(body?.company_id).trim() || toTextSafe(body?.id).trim();

    if (!companyId) {
      return NextResponse.json({ success: false, error: "Missing company_id" }, { status: 400, headers: corsHeaders });
    }

    let company;
    try {
      company = await deals.getById(companyId);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return NextResponse.json(
          { success: false, error: "Company not found (or not in your workspace)" },
          { status: 404, headers: corsHeaders }
        );
      }
      throw err;
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

    // Access off-market specific fields (exist in DB but not in Deal type)
    const companyWithExtras = company as Deal & {
      address?: string | null;
      phone?: string | null;
      rating?: number | null;
      ratings_total?: number | null;
      tier_reason?: Record<string, unknown> | null;
    };
    const ai = await runOffMarketInitialDiligenceAI({
      company: {
        company_name: company.company_name ?? null,
        website,
        address: companyWithExtras.address ?? null,
        phone: companyWithExtras.phone ?? null,
        rating: companyWithExtras.rating ?? null,
        ratings_total: companyWithExtras.ratings_total ?? null,
        tier_reason: companyWithExtras.tier_reason ?? null,
      },
      homepageText,
    });

    const confidenceJson = buildOffMarketConfidence(ai);

    const finalTier = (ai?.scoring?.final_tier || "").toUpperCase();
    const score =
      typeof ai?.scoring?.overall_score_0_100 === "number" && Number.isFinite(ai.scoring.overall_score_0_100)
        ? clampScore(ai.scoring.overall_score_0_100)
        : tierToScore(finalTier) ?? null;

    const redFlagsBulleted = bullets(ai.ai_red_flags);

    // ✅ Extract fields from analysis
    const verdict = ai.decision_framework?.verdict?.toLowerCase() || null;
    const verdictReason = ai.decision_framework?.primary_reason || null;
    const verdictConfidence = ai.decision_framework?.verdict_confidence?.toLowerCase() || null;
    const nextAction = ai.decision_framework?.recommended_next_action || null;
    const askingPrice = ai.deal_economics?.asking_price || null;
    const revenueTTM = ai.deal_economics?.revenue_ttm || null;
    const ebitdaTTM = ai.deal_economics?.ebitda_ttm || null;
    const sbaEligible = ai.deal_economics?.sba_eligible?.assessment === 'YES' ? true : 
                       ai.deal_economics?.sba_eligible?.assessment === 'NO' ? false : null;
    const dealSizeBand = ai.deal_economics?.deal_size_band || null;
    const outreachPriority = ai.decision_framework?.outreach_priority || null;

    // ✅ WRITE RESULTS TO DB (removed updated_at — your companies table doesn't have it)
    try {
      await deals.updateAnalysis(companyId, {
        website, // ensure saved if provided
        ai_summary: ai.ai_summary ?? null,
        ai_red_flags: redFlagsBulleted,
        ai_financials_json: ai.financials ?? null,
        ai_scoring_json: ai.scoring ?? null,
        criteria_match_json: ai.criteria_match ?? null,
        final_tier: finalTier === "A" || finalTier === "B" || finalTier === "C" ? finalTier : null,
        score,
        ai_confidence_json: confidenceJson,
      });

      // Update analysis outputs (fields not in updateAnalysis method)
      const updateData: any = {
        verdict: verdict === 'proceed' || verdict === 'park' || verdict === 'pass' ? verdict : null,
        verdict_reason: verdictReason,
        verdict_confidence: verdictConfidence === 'high' || verdictConfidence === 'medium' || verdictConfidence === 'low' ? verdictConfidence : null,
        next_action: nextAction,
        asking_price_extracted: askingPrice,
        revenue_ttm_extracted: revenueTTM,
        ebitda_ttm_extracted: ebitdaTTM,
        sba_eligible: sbaEligible,
        deal_size_band: dealSizeBand,
        stage: 'reviewing', // Auto-advance from 'new' to 'reviewing'
        last_action_at: new Date().toISOString(),
      };

      // Add outreach_priority if present (may not be in schema, but user requested it)
      if (outreachPriority) {
        updateData.outreach_priority = outreachPriority;
      }

      const { error: updateError } = await supabaseUser
        .from('companies')
        .update(updateData)
        .eq('id', companyId)
        .eq('workspace_id', workspace.id);

      if (updateError) {
        console.error('Failed to update deal analysis outputs:', updateError);
      }
    } catch (err) {
      console.error("off-market diligence DB update error:", err);
      return NextResponse.json(
        { success: false, error: "Analysis completed but failed to save results. Please refresh and try again." },
        { status: 500, headers: corsHeaders }
      );
    }

    // Log activity
    try {
      const { error: activityError } = await supabaseUser
        .from('deal_activities')
        .insert({
          workspace_id: workspace.id,
          deal_id: companyId,
          user_id: user.id,
          activity_type: 'off_market_analyzed',
          description: `AI analysis complete: ${verdict ? verdict.toUpperCase() : 'Unknown'} recommendation`,
          metadata: {
            verdict,
            verdict_confidence: verdictConfidence,
            analysis_type: 'off_market',
            outreach_priority: outreachPriority
          }
        });

      if (activityError) {
        console.error('Failed to log activity:', activityError);
      }
    } catch (activityErr) {
      console.error('Failed to log activity:', activityErr);
      // Don't fail the request, just log the error
    }

    // Revalidate deal page and dashboard
    if (companyId) {
      revalidatePath(`/deals/${companyId}`);
      revalidatePath('/dashboard');
    }

    return NextResponse.json(
      {
        success: true,
        companyId,
        ai_summary: ai.ai_summary,
        ai_red_flags: ai.ai_red_flags,
        financials: ai.financials,
        scoring: ai.scoring,
        criteria_match: ai.criteria_match,
        ai_confidence_json: confidenceJson,
      },
      { headers: corsHeaders }
    );
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("off-market diligence error:", error);
    return NextResponse.json({ success: false, error: "Unable to run off-market diligence. Please try again later." }, { status: 500, headers: corsHeaders });
  }
}
