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
    "data_confidence": "Low|Medium|High",
    "overall_score_0_100": 0,
    "final_tier": "A|B|C",
    "tier_basis": "string"
  },
  "criteria_match": {
    "business_model": "string",
    "owner_profile": "string",
    "notes_for_searcher": "string",
    "source_inputs": {{inputs_json}}
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
