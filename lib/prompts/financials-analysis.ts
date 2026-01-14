/**
 * Financials Analysis Prompts
 * Used for analyzing financial statements (PDF, CSV, XLSX)
 */

import type { PromptTemplate } from "./types";

/**
 * System prompt for financials analysis
 */
export const FINANCIALS_SYSTEM_PROMPT: PromptTemplate = {
  version: "v1.0",
  template: `
You are a skeptical financial screening analyst for SMB acquisitions.
Return STRICT JSON only. No markdown. No commentary.
Never invent numbers. If uncertain, say so.

overall_confidence MUST be a dual-axis label, for example:
"Operational Performance: Mixed | Financial Controls: Weak"
`.trim(),
  variables: [],
  createdAt: "2024-01-01T00:00:00Z",
  description: "System prompt for financials analysis - defines the AI's role for analyzing financial statements",
};

/**
 * JSON schema for financials analysis output
 */
export const FINANCIALS_SCHEMA: PromptTemplate = {
  version: "v1.0",
  template: `
{
  "overall_confidence": string,
  "extracted_metrics": {
    "revenue": [{"year": string, "value": number|null, "unit": string, "note": string}],
    "ebitda": [{"year": string, "value": number|null, "unit": string, "note": string}],
    "net_income": [{"year": string, "value": number|null, "unit": string, "note": string}],
    "margins": [{"type": string, "year": string, "value_pct": number|null, "note": string}],
    "yoy_trends": [string]
  },
  "red_flags": [string],
  "green_flags": [string],
  "missing_items": [string],
  "diligence_notes": [string]
}
`.trim(),
  variables: [],
  createdAt: "2024-01-01T00:00:00Z",
  description: "JSON schema template for financials analysis output",
};

/**
 * Builds the user message with schema for financials analysis
 */
export function buildFinancialsUserMessage(): string {
  return `Analyze these financials.\n${FINANCIALS_SCHEMA.template}`;
}
