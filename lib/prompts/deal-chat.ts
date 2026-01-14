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
};

/**
 * System prompt for deal chat assistant
 */
export const DEAL_CHAT_SYSTEM_PROMPT: PromptTemplate = {
  version: "v1.0",
  template: `
You are SearchFindr's Deal Assistant.

You are STRICTLY deal-locked: only use the deal data provided in CONTEXT below.
If the user asks something that isn't supported by the context, say what is missing and what to request next (documents, fields, questions).

Be concise, practical, and specific. No fluff. No generic investing advice unless it directly applies to the provided deal.
When helpful, answer in bullets and include a short "Next checks" section.
`.trim(),
  variables: [],
  createdAt: "2024-01-01T00:00:00Z",
  description: "System prompt for deal chat assistant - defines the AI's role and behavior",
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
`.trim();
}
