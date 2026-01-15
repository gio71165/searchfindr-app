/**
 * Off-Market Diligence Prompts
 * Used for initial diligence on off-market companies using website + Google listing data
 */

import type { PromptTemplate } from "./types";
import { buildPrompt } from "./types";

export type OffMarketDiligenceContext = {
  company_name?: string | null;
  website: string;
  address?: string | null;
  phone?: string | null;
  rating?: number | null;
  ratings_total?: number | null;
  homepageText: string;
  inputs?: any | null;
};

/**
 * Off-market diligence prompt template
 */
export const OFF_MARKET_DILIGENCE_PROMPT: PromptTemplate = {
  version: "v1.0",
  template: `
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

Do NOT include geography/industry fit scoring.

============================================================
INDUSTRY-SPECIFIC SIGNALS (LOOK FOR THESE)
============================================================
For common industries, look for specific signals that indicate business quality and risks:

HVAC / Trade Services / Home Services:
- "Established X years" claims - verify if consistent with other signals
- Technician count mentions - indicates scale and operational capacity
- Commercial vs residential mix - commercial typically more stable, higher margins
- Equipment fleet age - older fleet may indicate capital constraints or deferred maintenance
- Service area coverage - too broad may indicate thin coverage, too narrow may limit growth
- 24/7 emergency service - indicates recurring revenue potential
- Maintenance contract mentions - recurring revenue signal
- Licensing/certification claims - verify if mentioned (important for regulatory compliance)

Professional Services (Legal, Accounting, Consulting, Marketing):
- Partner/owner leverage - multiple partners may indicate succession risk or buyout complexity
- Client concentration - look for mentions of "Fortune 500" or specific large clients (concentration risk)
- Recurring revenue percentage - retainer vs project-based revenue mix
- Industry specialization - niche focus may indicate higher margins but limited market
- Team size and structure - junior vs senior staff ratio indicates scalability
- "Award-winning" or industry recognition - may indicate quality but verify substance
- Case studies or client testimonials - indicates client satisfaction and retention

Manufacturing:
- Equipment age and condition - critical for capital requirements and maintenance costs
- Customer/supplier concentration - look for mentions of key relationships
- Capacity utilization - "running at capacity" vs "excess capacity" signals different growth profiles
- Custom vs standard products - custom may indicate higher margins but lower scalability
- Location and facility details - proximity to suppliers/customers, facility size
- Certifications (ISO, etc.) - indicates quality systems and may be required for certain customers
- Export/import mentions - may indicate complexity or growth opportunity

When you identify industry-specific signals, include them in:
- business_model.evidence
- financials.evidence
- notes_for_searcher.what_to_verify_first
- notes_for_searcher.questions_to_ask_owner

============================================================
DECISION FRAMEWORK (REQUIRED)
============================================================
Since this is OFF-MARKET (company may not be for sale), assess:

outreach_priority: HIGH (clear signals, worth cold call) | MEDIUM (track, wait for signal) | LOW (not worth time)
outreach_angle: Best approach based on what you learned (e.g., "Owner is 67, likely succession planning window")
estimated_receptiveness: LIKELY (retirement age, industry consolidating) | POSSIBLE | UNLIKELY

Provide a DECISION FRAMEWORK. You are a skeptical buyer's advisor:

verdict: Should a searcher PROCEED (worth outreach), PARK (track for later), or PASS (not worth time)?
verdict_confidence: HIGH (data is complete), MEDIUM (some gaps), LOW (major unknowns)
primary_reason: ONE sentence for verdict
deal_killers: Issues that make you pass immediately (empty if none)
proceed_conditions: If PROCEED/PARK, what MUST be verified?
recommended_next_action: Be SPECIFIC - "Cold call owner mentioning succession planning angle" NOT "follow up"
estimated_time_to_decision: Given data quality, how long until outreach decision? (e.g., "Can decide in 1 week" | "Needs 2-3 weeks DD" | "Pass now")

Be OPINIONATED. Searchers pay for judgment, not just information.

============================================================
DEAL ECONOMICS (REQUIRED)
============================================================
Extract DEAL ECONOMICS even if incomplete - mark as UNKNOWN if not stated.

asking_price: Extract exact price if stated, else null (e.g., "$2.5M")
asking_price_confidence: STATED | IMPLIED | UNKNOWN
revenue_ttm: Most recent 12 months revenue (estimate if needed)
ebitda_ttm: Most recent 12 months EBITDA (estimate if needed)
ebitda_margin_pct: Calculate percentage if possible
implied_multiple: If price and EBITDA both known (e.g., "4.2x EBITDA")
deal_size_band: sub_1m | 1m_3m | 3m_5m | 5m_plus
sba_eligible: {
  assessment: YES if clearly <$5M + profitable + US, NO if clearly >$5M or unprofitable, LIKELY if probable, UNKNOWN if insufficient data
  reasoning: Why (e.g., "Under $5M, profitable, US-based = likely eligible")
}

Return ONLY valid JSON (no markdown) in this exact schema:

{
  "ai_summary": "string (2-4 sentences, factual, no hype)",
  "ai_red_flags": ["string (>=3 items; evidence-based if possible, otherwise 'Unknown: ... Verify ...')"],
  "business_model": {
    "services": ["string"],
    "customer_types": ["string"],
    "delivery_model": "string",
    "recurring_revenue_signals": ["string"],
    "differentiators": ["string"],
    "evidence": ["string"]
  },
  "owner_profile": {
    "known": boolean,
    "owner_names": ["string"],
    "ownership_type": "Unknown|Owner-operated|Family-owned|Partnership|Other",
    "evidence": ["string"],
    "assumptions": ["string"]
  },
  "notes_for_searcher": {
    "what_to_verify_first": ["string"],
    "questions_to_ask_owner": ["string"],
    "deal_angle": ["string"]
  },
  "financials": {
    "revenue_band_est": "Unknown|<$1M|$1–$3M|$3–$10M|$10M+",
    "ebitda_band_est": "Unknown|<$250k|$250k–$750k|$750k–$2M|$2M+",
    "pricing_power": "Low|Medium|High|Unknown",
    "customer_concentration_risk": "Low|Medium|High|Unknown",
    "seasonality_risk": "Low|Medium|High|Unknown",
    "evidence": ["string"]
  },
  "scoring": {
    "succession_risk": "Low|Medium|High|Unknown",
    "operational_quality_signal": "Low|Medium|High|Unknown",
    "data_confidence": "A|B|C",
    "overall_score_0_100": 0,
    "final_tier": "A|B|C",
    "tier_basis": "string"
  },
  "criteria_match": {
    "business_model": "string",
    "owner_profile": "string",
    "notes_for_searcher": "string",
    "source_inputs": {{inputs_json}}
  },
  "decision_framework": {
    "verdict": "PROCEED | PARK | PASS",
    "verdict_confidence": "HIGH | MEDIUM | LOW",
    "primary_reason": "string",
    "deal_killers": ["string"],
    "proceed_conditions": ["string"],
    "recommended_next_action": "string",
    "estimated_time_to_decision": "string",
    "outreach_priority": "HIGH | MEDIUM | LOW",
    "outreach_angle": "string",
    "estimated_receptiveness": "LIKELY | POSSIBLE | UNLIKELY"
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

Company metadata:
- Name: {{company_name}}
- Website: {{website}}
- Address: {{address}}
- Phone: {{phone}}
- Google rating: {{rating}}
- Ratings count: {{ratings_total}}

Homepage text:
{{homepageText}}
`.trim(),
  variables: ["company_name", "website", "address", "phone", "rating", "ratings_total", "homepageText", "inputs_json"],
  createdAt: "2024-01-01T00:00:00Z",
  description: "Prompt for off-market initial diligence using website and Google listing data",
};

/**
 * Builds the off-market diligence prompt with context substitution
 */
export function buildOffMarketDiligencePrompt(context: OffMarketDiligenceContext): string {
  // Handle inputs separately since it needs JSON stringification
  let prompt = buildPrompt(OFF_MARKET_DILIGENCE_PROMPT, {
    company_name: context.company_name ?? "",
    website: context.website,
    address: context.address ?? "",
    phone: context.phone ?? "",
    rating: context.rating ?? "",
    ratings_total: context.ratings_total ?? "",
    homepageText: context.homepageText || "(no homepage text available)",
    inputs_json: context.inputs ? JSON.stringify(context.inputs) : "null",
  });

  return prompt;
}
