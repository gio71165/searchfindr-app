// app/api/analyze-deal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { sanitizeForPrompt, sanitizeShortText } from "@/lib/utils/sanitize";
import { withRetry } from "@/lib/utils/retry";
import { DealsRepository } from "@/lib/data-access/deals";
import { logger } from "@/lib/utils/logger";
import type { DealScoring, FinancialMetrics, CriteriaMatch, ConfidenceJson } from "@/lib/types/deal";

export const runtime = "nodejs";

type DataConfidence = "A" | "B" | "C";

function normalizeLMH(input: unknown): "A" | "B" | "C" {
  const s = typeof input === "string" ? input.trim().toUpperCase() : "";
  
  // Direct A/B/C match
  if (s === "A" || s === "TIER A") return "A";
  if (s === "B" || s === "TIER B") return "B";
  if (s === "C" || s === "TIER C") return "C";
  
  // Map old low/medium/high to A/B/C
  const lower = s.toLowerCase();
  if (lower === "high" || lower.includes("high")) return "A";
  if (lower === "medium" || lower.includes("medium")) return "B";
  if (lower === "low" || lower.includes("low")) return "C";
  
  // Default to C (lowest confidence)
  return "C";
}

function normalizeABC(input: unknown): "A" | "B" | "C" {
  const s = typeof input === "string" ? input.trim().toUpperCase() : "";
  if (s === "A" || s === "TIER A") return "A";
  if (s === "B" || s === "TIER B") return "B";
  if (s === "C" || s === "TIER C") return "C";

  // Back-compat: Tier 1/2/3
  if (s === "TIER 1" || s === "TIER1" || s === "1") return "A";
  if (s === "TIER 2" || s === "TIER2" || s === "2") return "B";
  if (s === "TIER 3" || s === "TIER3" || s === "3") return "C";

  // "Caution" style
  if (s.includes("CAUTION") || s.includes("AVOID") || s.includes("RED")) return "C";

  return "C";
}

function normalizeDataConfidence(input: unknown): DataConfidence {
  const s = typeof input === "string" ? input.trim().toUpperCase() : "";
  
  // Direct A/B/C match
  if (s === "A" || s === "TIER A") return "A";
  if (s === "B" || s === "TIER B") return "B";
  if (s === "C" || s === "TIER C") return "C";
  
  // Map old low/medium/high to A/B/C
  const lower = s.toLowerCase();
  if (lower === "high" || lower.includes("high")) return "A";
  if (lower === "medium" || lower.includes("medium")) return "B";
  if (lower === "low" || lower.includes("low")) return "C";
  
  // Default to C (lowest confidence)
  return "C";
}

function confidenceIcon(level: DataConfidence) {
  return level === "A" ? "●" : level === "B" ? "◑" : "⚠️";
}

function buildDataConfidenceSummary(level: DataConfidence) {
  // IMPORTANT: make it clear this is *data/input* confidence, not model confidence
  if (level === "A") return "A tier data confidence — listing includes specific operational + financial detail.";
  if (level === "B") return "B tier data confidence — some specifics, but key facts still missing or vague.";
  return "C tier data confidence — listing is sparse/marketing-heavy; major facts require verification.";
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate request first
    const { supabase: supabaseUser, user, workspace } = await authenticateRequest(req);
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const { listingText, companyName, city, state, sourceType, listingUrl, dealId } = await req.json();

    if (!listingText || String(listingText).trim().length === 0) {
      return NextResponse.json({ error: "No listing text provided." }, { status: 400 });
    }

    // Sanitize all user inputs
    const sanitizedCompanyName = sanitizeShortText(companyName);
    const sanitizedCity = sanitizeShortText(city);
    const sanitizedState = sanitizeShortText(state);
    const sanitizedListingUrl = sanitizeShortText(listingUrl);
    const sanitizedListingText = sanitizeForPrompt(listingText);

    // 🧠 AI PROMPT — updated schema
    const prompt = `
You are helping a search fund / ETA buyer evaluate a lower middle market deal.

You will be given:
- Basic deal info (company name, location, source, etc.)
- Raw listing text

Return a JSON object with this EXACT structure (no extra keys):

{
  "ai_summary": "High-level narrative of the business and opportunity (2–5 sentences, direct).",
  "ai_red_flags": "Bullet-style text of key risks / concerns (string).",
  "financials": {
    "revenue": "Text version of revenue (or 'Not stated')",
    "ebitda": "Text version of EBITDA (or 'Not stated')",
    "margin": "EBITDA margin description if stated/inferred (or 'Not stated')",
    "customer_concentration": "Any key account risk or 'Not stated'"
  },
  "scoring": {
    "succession_risk": "Low | Medium | High",
    "succession_risk_reason": "Short explanation",
    "industry_fit": "Low | Medium | High",
    "industry_fit_reason": "Short explanation",
    "geography_fit": "Low | Medium | High",
    "geography_fit_reason": "Short explanation",
    "data_confidence": "A | B | C",
    "data_confidence_reason": "One sentence explaining confidence in the INPUT data quality (A = high, B = medium, C = low)",
    "final_tier": "A | B | C",
    "final_tier_reason": "Short explanation"
  },
  "criteria_match": {
    "deal_size": "Fit vs typical $2–5M EBITDA target",
    "business_model": "Recurring / sticky / boring?",
    "owner_profile": "Age / retirement / succession notes",
    "notes_for_searcher": "Actionable takeaways"
  },
  "decision_framework": {
    "verdict": "PROCEED | PARK | PASS",
    "verdict_confidence": "HIGH | MEDIUM | LOW",
    "primary_reason": "string",
    "deal_killers": ["string"],
    "proceed_conditions": ["string"],
    "recommended_next_action": "string",
    "estimated_time_to_decision": "string"
  },
  "deal_economics": {
    "asking_price": "string | null",
    "asking_price_confidence": "STATED | IMPLIED | UNKNOWN",
    "revenue_ttm": "string | null",
    "ebitda_ttm": "string | null",
    "ebitda_margin_pct": "string | null",
    "implied_multiple": "string | null",
    "deal_size_band": "sub_1m | 1m_3m | 3m_5m | 5m_plus",
    "sba_eligible": {
      "assessment": "YES | NO | LIKELY | UNKNOWN",
      "reasoning": "string"
    }
  }
}

Rules:
- Use only info stated or strongly implied in the listing.
- If data is missing, explicitly say "Not stated" / "Unknown".
- "data_confidence" MUST be A, B, or C (A = high confidence/strong data, B = medium confidence/some gaps, C = low confidence/weak data). This reflects how complete and specific the LISTING TEXT is (not 'AI uncertainty').
- "final_tier" MUST be exactly A, B, or C (no Tier 1/2/3, no Caution).

============================================================
DECISION FRAMEWORK (REQUIRED)
============================================================
Provide a DECISION FRAMEWORK. You are a skeptical buyer's advisor:

verdict: Should a searcher PROCEED (submit IOI), PARK (interesting but need more info), or PASS (not worth time)?
verdict_confidence: HIGH (data is complete), MEDIUM (some gaps), LOW (major unknowns)
primary_reason: ONE sentence for verdict
deal_killers: Issues that make you pass immediately (empty if none)
proceed_conditions: If PROCEED/PARK, what MUST be verified?
recommended_next_action: Be SPECIFIC - "Schedule call with broker to clarify X" NOT "follow up"
estimated_time_to_decision: Given listing quality, how long until LOI? (e.g., "Can decide in 1 week" | "Needs 2-3 weeks DD" | "Pass now")

Be OPINIONATED. Searchers pay for judgment, not just information.

============================================================
DEAL ECONOMICS (REQUIRED)
============================================================
Extract DEAL ECONOMICS even if incomplete - mark as UNKNOWN if not stated.

asking_price: Extract exact price if stated, else null (e.g., "$2.5M")
asking_price_confidence: STATED | IMPLIED | UNKNOWN
revenue_ttm: Most recent 12 months revenue
ebitda_ttm: Most recent 12 months EBITDA
ebitda_margin_pct: Calculate percentage
implied_multiple: If price and EBITDA both known (e.g., "4.2x EBITDA")
deal_size_band: sub_1m | 1m_3m | 3m_5m | 5m_plus
sba_eligible: {
  assessment: YES if clearly <$5M + profitable + US, NO if clearly >$5M or unprofitable, LIKELY if probable, UNKNOWN if insufficient data
  reasoning: Why (e.g., "Under $5M, profitable, US-based = likely eligible")
}

Company:
- Name: ${sanitizedCompanyName || ""}
- Location: ${sanitizedCity || ""} ${sanitizedState || ""}
- Source: ${sourceType || ""}
- URL: ${sanitizedListingUrl || ""}

Listing Text:
"""${sanitizedListingText}"""
`.trim();

    // 🧠 CALL OPENAI with retry logic
    const aiResponse = await withRetry(
      () =>
        fetch("https://api.openai.com/v1/chat/completions", {
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
        }),
      { maxRetries: 2, delayMs: 1000 }
    );

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      logger.error("OpenAI error:", errorBody);
      return NextResponse.json({ error: "Unable to analyze deal. Please try again later." }, { status: 500 });
    }

    // 🧠 PARSE OPENAI RESPONSE
    const aiData = await aiResponse.json();
    const content: string = aiData?.choices?.[0]?.message?.content ?? "";

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      logger.error("JSON Parse Error:", err, content?.substring(0, 500)); // Limit content length in logs
      return NextResponse.json({ error: "Unable to process analysis results. Please try again." }, { status: 500 });
    }

    // ✅ Normalize outputs so UI never sees old/dirty labels
    const scoring = parsed?.scoring && typeof parsed.scoring === "object" ? parsed.scoring : {};

    scoring.succession_risk = normalizeLMH(scoring.succession_risk);
    scoring.industry_fit = normalizeLMH(scoring.industry_fit);
    scoring.geography_fit = normalizeLMH(scoring.geography_fit);

    scoring.final_tier = normalizeABC(scoring.final_tier);

    const dc = normalizeDataConfidence(scoring.data_confidence);
    // Store as A/B/C tier
    scoring.data_confidence = dc;
    if (typeof scoring.data_confidence_reason !== "string" || !scoring.data_confidence_reason.trim()) {
      scoring.data_confidence_reason = buildDataConfidenceSummary(dc);
    }

    parsed.scoring = scoring;

    // ✅ Add a standardized confidence object for your dashboard/UX (DATA confidence)
    parsed.ai_confidence_json = {
      level: dc,
      icon: confidenceIcon(dc),
      summary: buildDataConfidenceSummary(dc),
      signals: [
        { label: "Inputs", value: "Listing text (on-market style)" },
        { label: "Meaning", value: "Confidence in DATA quality, not AI certainty" },
      ],
      source: "analyze_deal",
      updated_at: new Date().toISOString(),
    };

    // ✅ Save analysis outputs to database if dealId is provided
    if (dealId) {
      try {
        const deals = new DealsRepository(supabaseUser, workspace.id);
        
        // Extract fields from analysis
        const verdict = parsed.decision_framework?.verdict?.toLowerCase() || null;
        const verdictReason = parsed.decision_framework?.primary_reason || null;
        const verdictConfidence = parsed.decision_framework?.verdict_confidence?.toLowerCase() || null;
        const nextAction = parsed.decision_framework?.recommended_next_action || null;
        const askingPrice = parsed.deal_economics?.asking_price || null;
        const revenueTTM = parsed.deal_economics?.revenue_ttm || null;
        const ebitdaTTM = parsed.deal_economics?.ebitda_ttm || null;
        const sbaEligible = parsed.deal_economics?.sba_eligible?.assessment === 'YES' ? true : 
                           parsed.deal_economics?.sba_eligible?.assessment === 'NO' ? false : null;
        const dealSizeBand = parsed.deal_economics?.deal_size_band || null;

        // Update database - first update analysis fields
        await deals.updateAnalysis(dealId, {
          ai_summary: parsed.ai_summary,
          ai_red_flags: parsed.ai_red_flags,
          ai_financials_json: parsed.financials,
          ai_scoring_json: parsed.scoring,
          criteria_match_json: parsed.criteria_match,
          ai_confidence_json: parsed.ai_confidence_json,
        });

        // Update analysis outputs (fields not in updateAnalysis method)
        const { error: updateError } = await supabaseUser
          .from('companies')
          .update({
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
          })
          .eq('id', dealId)
          .eq('workspace_id', workspace.id);

        if (updateError) {
          logger.error('Failed to update deal analysis outputs:', updateError);
        }

        // Log activity
        const { error: activityError } = await supabaseUser
          .from('deal_activities')
          .insert({
            workspace_id: workspace.id,
            deal_id: dealId,
            user_id: user.id,
            activity_type: 'on_market_analyzed',
            description: `AI analysis complete: ${verdict ? verdict.toUpperCase() : 'Unknown'} recommendation`,
            metadata: {
              verdict,
              verdict_confidence: verdictConfidence,
              analysis_type: 'on_market'
            }
          });

        if (activityError) {
          console.error('Failed to log activity:', activityError);
        }
      } catch (dbErr) {
        console.error('Failed to update deal:', dbErr);
        // Don't fail the request, just log the error
      }

      // Revalidate deal page and dashboard if dealId was provided
      if (dealId) {
        revalidatePath(`/deals/${dealId}`);
        revalidatePath('/dashboard');
      }
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const error = err instanceof Error ? err : new Error("Unknown error");
    logger.error("analyze-deal error:", error.message);
    return NextResponse.json({ error: "Unable to analyze deal. Please try again later." }, { status: 500 });
  }
}
