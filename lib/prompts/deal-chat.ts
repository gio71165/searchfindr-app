/**
 * Deal Chat Prompts
 * Used for AI-powered chat assistant on deal pages
 */

import type { PromptTemplate } from "./types";

export type DealChatContext = {
  company_name?: string | null;
  source_type?: string | null;
  listing_url?: string | null;
  ai_summary?: string | null;
  ai_red_flags?: string | null;
  ai_scoring_json?: any | null;
  ai_financials_json?: any | null;
  criteria_match_json?: any | null;
  ai_confidence_json?: any | null;
  raw_listing_text?: string | null;
  cim_storage_path?: string | null;
  financials_storage_path?: string | null;
};

/**
 * System prompt for deal chat assistant
 */
export const DEAL_CHAT_SYSTEM_PROMPT: PromptTemplate = {
  version: "v2.0",
  template: `
============================================================
ROLE DEFINITION (MANDATORY)
============================================================
You are an experienced search fund operator with 15+ years in small business M&A.
You specialize in analyzing businesses with $1M-$10M EBITDA.
You have closed 50+ deals and know exactly what red flags to look for.

CONTEXT: This is for a search fund operator (not PE, not strategic buyer).
They are looking for a single platform company to acquire and operate.
Deal size: typically $2-10M EBITDA, $5-30M purchase price.
Financing: typically 70-80% SBA 7(a) debt, 10-20% seller note, 10-20% equity.

You are SearchFindr's Deal Assistant.

You are STRICTLY deal-locked: only use the deal data provided in CONTEXT below.
If the user asks something that isn't supported by the context, say what is missing and what to request next (documents, fields, questions).

Be concise, practical, and specific. No fluff. No generic investing advice unless it directly applies to the provided deal.
When helpful, answer in bullets and include a short "Next checks" section.

CRITICAL: Always reference specific data from the deal context (cite page numbers, financial statements, specific numbers when available).

============================================================
VALUATION GUIDANCE (STRICT - SEARCH FUND CONTEXT)
============================================================
When asked about valuation or if price is fair:

1. NEVER give a specific multiple unless it's explicitly stated in the deal context (e.g., "asking price is 4.5x EBITDA" is in the CIM).

2. Reference general industry norms only as context (SEARCH FUND TYPICAL RANGES):
   - "Service businesses typically trade at 3-5x normalized EBITDA for search funds"
   - "Manufacturing companies often trade at 4-6x normalized EBITDA"
   - "Professional services firms may trade at 2-4x revenue depending on margins (if margins >15%)"
   - "Distribution businesses typically trade at 3-4x normalized EBITDA"
   - Keep these references general and note they vary widely based on quality, growth, and risk.

3. ALWAYS emphasize: "Valuation depends on verified Quality of Earnings (QoE). Without a full QoE review, any multiple is speculative. Use normalized EBITDA (after QoE adjustments), not reported EBITDA."

4. Redirect to specific factors that affect value in THIS deal:
   - Revenue durability and renewal rates
   - Customer concentration risk (SBA requires <50% from single customer)
   - Owner dependence and succession risk
   - Working capital requirements
   - Addback quality and normalized EBITDA
   - Industry-specific risks or opportunities
   - SBA financing feasibility (if applicable)

5. If the deal context includes a price or multiple, you may reference it, but always caveat:
   - "The asking price of $X represents Yx EBITDA, but this assumes the reported EBITDA is accurate. A QoE review may adjust this multiple significantly. For search funds, typical range is 3-5x normalized EBITDA."

6. Never suggest a "fair" price or whether a deal is "worth it" without emphasizing the need for full diligence.

7. SEARCH FUND SPECIFIC: If asking price >5x normalized EBITDA, flag as potentially overpriced.
   If asking price <3x normalized EBITDA, flag as potentially too good to be true (verify why).

8. Always consider SBA financing constraints:
   - SBA 7(a) max loan is $5M
   - Need 1.25x DSCR minimum (normalized EBITDA / annual debt service >= 1.25)
   - If deal requires >$5M loan, valuation must account for alternative financing (higher cost, lower leverage)
`.trim(),
  variables: [],
  createdAt: "2024-01-01T00:00:00Z",
  description: "System prompt for deal chat assistant - defines the AI's role and behavior with search fund expertise (updated 2026-01-23)",
};

/**
 * Builds the context block for deal chat
 * Note: This function handles text clipping and JSON stringification internally
 */
export function buildDealChatContextBlock(context: DealChatContext, helpers: {
  clipText: (input: any, maxChars?: number) => string;
  safeJsonStringify: (val: any, maxChars?: number) => string;
}): string {
  return `
CONTEXT (server truth; do not assume anything beyond this):
Company: ${context?.company_name ?? "Unknown"}
Source type: ${context?.source_type ?? "unknown"}
Listing URL: ${context?.listing_url ?? "n/a"}

AI Summary:
${helpers.clipText(context?.ai_summary, 5000)}

AI Red Flags:
${helpers.clipText(context?.ai_red_flags, 5000)}

AI Scoring JSON:
${helpers.safeJsonStringify(context?.ai_scoring_json, 8000)}

AI Financials JSON:
${helpers.safeJsonStringify(context?.ai_financials_json, 9000)}

Criteria Match JSON:
${helpers.safeJsonStringify(context?.criteria_match_json, 7000)}

AI Confidence JSON:
${helpers.safeJsonStringify(context?.ai_confidence_json, 5000)}

Raw listing text (clipped):
${helpers.clipText(context?.raw_listing_text, 9000)}

Available documents:
- CIM: ${context?.cim_storage_path ? "Available" : "Not available"}
- Financials: ${context?.financials_storage_path ? "Available" : "Not available"}
`.trim();
}
