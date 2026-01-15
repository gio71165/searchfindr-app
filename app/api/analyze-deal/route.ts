// app/api/analyze-deal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { sanitizeForPrompt, sanitizeShortText } from "@/lib/utils/sanitize";
import { withRetry } from "@/lib/utils/retry";
import type { DealScoring, FinancialMetrics, CriteriaMatch, ConfidenceJson } from "@/lib/types/deal";

export const runtime = "nodejs";

type DataConfidence = "low" | "medium" | "high";

function normalizeLMH(input: unknown): "Low" | "Medium" | "High" {
  const s = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (s === "low") return "Low";
  if (s === "medium") return "Medium";
  if (s === "high") return "High";

  // Back-compat: if model returns "Tier A/B/C" by accident
  if (s === "tier a" || s === "a") return "High";
  if (s === "tier b" || s === "b") return "Medium";
  if (s === "tier c" || s === "c") return "Low";

  return "Low";
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
  const s = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

function confidenceIcon(level: DataConfidence) {
  return level === "high" ? "●" : level === "medium" ? "◑" : "⚠️";
}

function buildDataConfidenceSummary(level: DataConfidence) {
  // IMPORTANT: make it clear this is *data/input* confidence, not model confidence
  if (level === "high") return "High data confidence — listing includes specific operational + financial detail.";
  if (level === "medium") return "Medium data confidence — some specifics, but key facts still missing or vague.";
  return "Low data confidence — listing is sparse/marketing-heavy; major facts require verification.";
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate request first
    await authenticateRequest(req);
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const { listingText, companyName, city, state, sourceType, listingUrl } = await req.json();

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
    "data_confidence": "Low | Medium | High",
    "data_confidence_reason": "One sentence explaining confidence in the INPUT data quality",
    "final_tier": "A | B | C",
    "final_tier_reason": "Short explanation"
  },
  "criteria_match": {
    "deal_size": "Fit vs typical $2–5M EBITDA target",
    "business_model": "Recurring / sticky / boring?",
    "owner_profile": "Age / retirement / succession notes",
    "notes_for_searcher": "Actionable takeaways"
  }
}

Rules:
- Use only info stated or strongly implied in the listing.
- If data is missing, explicitly say "Not stated" / "Unknown".
- "data_confidence" must reflect how complete and specific the LISTING TEXT is (not 'AI uncertainty').
- "final_tier" MUST be exactly A, B, or C (no Tier 1/2/3, no Caution).

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
      console.error("OpenAI error:", errorBody);
      return NextResponse.json({ error: "Unable to analyze deal. Please try again later." }, { status: 500 });
    }

    // 🧠 PARSE OPENAI RESPONSE
    const aiData = await aiResponse.json();
    const content: string = aiData?.choices?.[0]?.message?.content ?? "";

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("JSON Parse Error:", err, content);
      return NextResponse.json({ error: "Unable to process analysis results. Please try again." }, { status: 500 });
    }

    // ✅ Normalize outputs so UI never sees old/dirty labels
    const scoring = parsed?.scoring && typeof parsed.scoring === "object" ? parsed.scoring : {};

    scoring.succession_risk = normalizeLMH(scoring.succession_risk);
    scoring.industry_fit = normalizeLMH(scoring.industry_fit);
    scoring.geography_fit = normalizeLMH(scoring.geography_fit);

    scoring.final_tier = normalizeABC(scoring.final_tier);

    const dc = normalizeDataConfidence(scoring.data_confidence);
    scoring.data_confidence = dc === "high" ? "High" : dc === "medium" ? "Medium" : "Low";
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

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error("analyze-deal error:", error);
    return NextResponse.json({ error: "Unable to analyze deal. Please try again later." }, { status: 500 });
  }
}
