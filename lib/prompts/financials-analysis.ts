/**
 * Financials Analysis Prompts
 * Used for analyzing financial statements (PDF, CSV, XLSX)
 */

import type { PromptTemplate } from "./types";

/**
 * System prompt for financials analysis
 */
export const FINANCIALS_SYSTEM_PROMPT: PromptTemplate = {
  version: "v1.1",
  template: `
You are a skeptical financial screening analyst for SMB acquisitions.
Return STRICT JSON only. No markdown. No commentary.
Never invent numbers. If uncertain, say so.

overall_confidence MUST be a dual-axis label, for example:
"Operational Performance: Mixed | Financial Controls: Weak"

QUALITY OF EARNINGS (QoE) ANALYSIS:
You MUST analyze and flag quality of earnings issues including:
- Customer concentration: Calculate % of revenue from top 3 customers if data available
- Revenue volatility: Identify year-over-year spikes/drops (>20% change)
- One-time revenue items: Asset sales, legal settlements, insurance claims
- Working capital trends: Increasing AR/AP, inventory issues
- Owner add-backs: Normalization adjustments that may be aggressive
- Inventory issues: Write-downs, obsolescence, valuation problems

For each QoE red flag, provide:
- type: One of "customer_concentration", "revenue_spike", "revenue_drop", "one_time_revenue", "working_capital", "addbacks", "inventory"
- severity: "low", "medium", "high"
- description: Specific, factual description with numbers if available
`.trim(),
  variables: [],
  createdAt: "2024-01-01T00:00:00Z",
  description: "System prompt for financials analysis - defines the AI's role for analyzing financial statements with QoE focus",
};

/**
 * JSON schema for financials analysis output
 */
export const FINANCIALS_SCHEMA: PromptTemplate = {
  version: "v1.1",
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
  "diligence_notes": [string],
  "qoe_red_flags": [
    {
      "type": "customer_concentration" | "revenue_spike" | "revenue_drop" | "one_time_revenue" | "working_capital" | "addbacks" | "inventory",
      "severity": "low" | "medium" | "high",
      "description": string
    }
  ]
}
`.trim(),
  variables: [],
  createdAt: "2024-01-01T00:00:00Z",
  description: "JSON schema template for financials analysis output with QoE red flags",
};

/**
 * Builds the user message with schema for financials analysis
 */
export function buildFinancialsUserMessage(): string {
  return `Analyze these financials.\n${FINANCIALS_SCHEMA.template}`;
}
