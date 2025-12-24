// lib/onmarket/normalize.ts

import type { ExtractedFields, ListingStub } from "./parsers/types";

export type NormalizedDeal = {
  company_name: string | null;
  headline: string;

  industry_tag: string | null;
  industry_confidence: number; // 0-100

  location_city: string | null;
  location_state: string | null;

  revenue_min: number | null;
  revenue_max: number | null;
  ebitda_min: number | null;
  ebitda_max: number | null;

  revenue_band: string | null;
  ebitda_band: string | null;

  asking_price: number | null;

  deal_type: "asset" | "stock" | "unknown";

  has_teaser_pdf: boolean;

  source_name: string;
  source_url: string;

  data_confidence: "high" | "medium" | "low";
  confidence_score: number; // 0-100 (internal only; UI should NOT display the number)

  published_at: string | null; // ISO if known

  // helpful debug fields
  debug?: Record<string, unknown>;
};

export type NormalizeInput = {
  sourceName: string;
  sourceUrl: string;
  listing: ListingStub;
  extracted: ExtractedFields | null;
};

/**
 * Normalize scraped + extracted fields into a canonical deal record.
 * Rules:
 * - Do NOT invent numbers.
 * - Only set revenue/EBITDA when explicitly present and parseable.
 * - Confidence is based on completeness, not "AI vibes".
 * - Global UI should show ONLY data_confidence label (low/medium/high), not the numeric score.
 */
export function normalizeDeal(input: NormalizeInput): NormalizedDeal {
  const { sourceName, sourceUrl, listing, extracted } = input;

  // Use the best available headline
  const headline = (listing.title || extracted?.company_name || "On-market listing").trim();

  const company_name = extracted?.company_name ? cleanText(extracted.company_name) : null;

  const loc = normalizeLocation(extracted?.city ?? null, extracted?.state ?? null);

  // ✅ Infer industry from BOTH extracted terms and page/headline text (MVP-safe)
  const industry = mapIndustry([
    ...(extracted?.industry_terms ?? []),
    listing.title ?? "",
    extracted?.company_name ?? "",
    headline ?? "",
    String(extracted?.raw?.text_sample ?? ""),
  ]);

  const deal_type = mapDealType(extracted?.deal_type_terms ?? []);

  const has_teaser_pdf = Boolean(extracted?.teaser_pdf_url);

  // Parse financial numbers conservatively from financials_strings + page text_sample (if included)
  const finText = [
    ...(extracted?.financials_strings ?? []),
    String(extracted?.raw?.text_sample ?? ""),
  ].join(" \n ");

  const revenueRange = extractRange(finText, ["revenue", "sales", "gross revenue", "total revenue"]);
  const ebitdaRange = extractRange(finText, ["ebitda", "sde", "seller's discretionary earnings", "cash flow"]);

  const revenue_min = revenueRange?.min ?? null;
  const revenue_max = revenueRange?.max ?? null;
  const ebitda_min = ebitdaRange?.min ?? null;
  const ebitda_max = ebitdaRange?.max ?? null;

  const revenue_band = deriveRevenueBand(revenue_min, revenue_max);
  const ebitda_band = deriveEbitdaBand(ebitda_min, ebitda_max);

  // Asking price: only if extracted explicitly
  const asking_price = extracted?.asking_price ?? null;

  const { confidence_score, data_confidence } = computeConfidence({
    hasCompany: Boolean(company_name),
    hasHeadline: Boolean(headline),
    hasIndustry: Boolean(industry.tag),
    hasGeo: Boolean(loc.state || loc.city),
    hasAnyFinancial: Boolean(revenue_min || revenue_max || ebitda_min || ebitda_max),
    hasAskingPrice: Boolean(asking_price),
    hasTeaser: has_teaser_pdf,
  });

  return {
    company_name,
    headline,

    industry_tag: industry.tag,
    industry_confidence: industry.confidence,

    location_city: loc.city,
    location_state: loc.state,

    revenue_min,
    revenue_max,
    ebitda_min,
    ebitda_max,

    revenue_band,
    ebitda_band,

    asking_price,

    deal_type,

    has_teaser_pdf,

    source_name: sourceName,
    source_url: sourceUrl,

    data_confidence,
    // NOTE: keep stored for internal ranking/debug; UI should only show data_confidence label.
    confidence_score,

    published_at: listing.maybe_date ?? null,

    debug: {
      industry_terms: extracted?.industry_terms ?? [],
      deal_type_terms: extracted?.deal_type_terms ?? [],
      financials_strings: extracted?.financials_strings ?? [],
      headline_used: headline,
    },
  };
}

/* =======================================================================================
   Confidence scoring (completeness-based)
======================================================================================= */

function computeConfidence(input: {
  hasCompany: boolean;
  hasHeadline: boolean;
  hasIndustry: boolean;
  hasGeo: boolean;
  hasAnyFinancial: boolean;
  hasAskingPrice: boolean;
  hasTeaser: boolean;
}): { confidence_score: number; data_confidence: "high" | "medium" | "low" } {
  // Total 100 points
  let score = 0;

  if (input.hasHeadline) score += 15;
  if (input.hasCompany) score += 15;
  if (input.hasIndustry) score += 15;
  if (input.hasGeo) score += 15;

  if (input.hasAnyFinancial) score += 20;
  if (input.hasAskingPrice) score += 10;
  if (input.hasTeaser) score += 10;

  // Clamp
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  // Label only (this is what the UI should display)
  let data_confidence: "high" | "medium" | "low" = "low";
  if (score >= 75) data_confidence = "high";
  else if (score >= 45) data_confidence = "medium";

  return { confidence_score: score, data_confidence };
}

/* =======================================================================================
   Industry mapping (conservative MVP)
   ✅ FIX: substring matching across combined terms/headline text
======================================================================================= */

function mapIndustry(terms: string[]): { tag: string | null; confidence: number } {
  const blob = terms
    .filter(Boolean)
    .map((x) => String(x).toLowerCase())
    .join(" | ");

  const has = (keys: string[]) => keys.some((k) => blob.includes(k));

  // Conservative mapping. Expand later.
  const rules: Array<{ tag: string; keys: string[]; confidence: number }> = [
    { tag: "HVAC", keys: ["hvac", "heating", "air conditioning", "a/c"], confidence: 80 },
    { tag: "Plumbing", keys: ["plumbing", "plumber"], confidence: 80 },
    { tag: "Electrical", keys: ["electrical", "electrician"], confidence: 80 },

    { tag: "Construction", keys: ["construction", "contractor", "masonry", "concrete", "remodel", "roofing"], confidence: 75 },
    { tag: "Manufacturing", keys: ["manufacturing", "manufacturer", "fabrication", "machine shop", "production"], confidence: 75 },

    { tag: "Healthcare", keys: ["healthcare", "medical", "clinic", "practice", "pain management", "mental health", "addiction"], confidence: 70 },
    { tag: "Dental", keys: ["dental", "dentist", "orthodont"], confidence: 75 },

    { tag: "Auto", keys: ["auto repair", "automotive", "collision", "body shop", "tire"], confidence: 70 },
    { tag: "Logistics", keys: ["logistics", "transportation", "trucking", "freight", "carrier"], confidence: 70 },

    { tag: "IT Services", keys: ["it services", "managed services", "msp", "it professional"], confidence: 70 },

    // SMB only focus — still helpful for filtering later, but lower confidence
    { tag: "Software", keys: ["software", "saas"], confidence: 60 },
  ];

  for (const r of rules) {
    if (has(r.keys)) return { tag: r.tag, confidence: r.confidence };
  }

  return { tag: null, confidence: 0 };
}

/* =======================================================================================
   Deal type mapping
======================================================================================= */

function mapDealType(terms: string[]): "asset" | "stock" | "unknown" {
  const t = terms.map((x) => x.toLowerCase());
  if (t.some((x) => x.includes("asset"))) return "asset";
  if (t.some((x) => x.includes("stock") || x.includes("membership"))) return "stock";
  return "unknown";
}

/* =======================================================================================
   Location normalization
======================================================================================= */

function normalizeLocation(
  city: string | null,
  state: string | null
): { city: string | null; state: string | null } {
  const c = city ? cleanText(city) : null;
  const s = state ? cleanText(state).toUpperCase() : null;

  // State: allow 2-letter codes only for MVP; otherwise null
  const state2 = s && /^[A-Z]{2}$/.test(s) ? s : null;

  return { city: c, state: state2 };
}

/* =======================================================================================
   Bands
======================================================================================= */

function deriveRevenueBand(min: number | null, max: number | null): string | null {
  const v = pickRepresentative(min, max);
  if (v === null) return null;

  if (v < 1_000_000) return "<$1M";
  if (v < 5_000_000) return "$1–5M";
  if (v < 10_000_000) return "$5–10M";
  if (v < 25_000_000) return "$10–25M";
  if (v < 50_000_000) return "$25–50M";
  return "$50M+";
}

function deriveEbitdaBand(min: number | null, max: number | null): string | null {
  const v = pickRepresentative(min, max);
  if (v === null) return null;

  if (v < 250_000) return "<$250K";
  if (v < 500_000) return "$250–500K";
  if (v < 1_000_000) return "$500K–$1M";
  if (v < 2_500_000) return "$1–2.5M";
  if (v < 5_000_000) return "$2.5–5M";
  return "$5M+";
}

function pickRepresentative(min: number | null, max: number | null): number | null {
  if (min !== null && max !== null) return Math.round((min + max) / 2);
  if (min !== null) return min;
  if (max !== null) return max;
  return null;
}

/* =======================================================================================
   Conservative range extraction from text
======================================================================================= */

function extractRange(text: string, keywords: string[]): { min: number; max: number } | null {
  const lower = text.toLowerCase();

  // only consider windows where keyword appears
  const hits: string[] = [];
  for (const k of keywords) {
    let idx = lower.indexOf(k);
    while (idx !== -1) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(lower.length, idx + 220);
      hits.push(text.slice(start, end));
      idx = lower.indexOf(k, idx + k.length);
    }
  }
  if (hits.length === 0) return null;

  // Try to find a range first
  for (const chunk of hits) {
    const range = parseMoneyRange(chunk);
    if (range) return range;

    const single = parseSingleMoney(chunk);
    if (single !== null) return { min: single, max: single };
  }

  return null;
}

function parseMoneyRange(s: string): { min: number; max: number } | null {
  // Examples:
  // "$1.2M - $2.0M"
  // "$450k to $650k"
  const re =
    /\$?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?)\s*([KkMmBb])?\s*(?:-|to)\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?)\s*([KkMmBb])?/;
  const m = s.match(re);
  if (!m) return null;

  const a = parseMoney(m[1], m[2]);
  const b = parseMoney(m[3], m[4]);
  if (a === null || b === null) return null;

  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return { min, max };
}

function parseSingleMoney(s: string): number | null {
  // Example: "$3.2M", "$450k", "USD 1,200,000"
  const re = /\$?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?)\s*([KkMmBb])?/;
  const m = s.match(re);
  if (!m) return null;

  return parseMoney(m[1], m[2]);
}

function parseMoney(numRaw: string, suffixRaw?: string): number | null {
  const base = Number(numRaw.replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;

  const suf = (suffixRaw ?? "").toLowerCase();
  if (suf === "k") return Math.round(base * 1_000);
  if (suf === "m") return Math.round(base * 1_000_000);
  if (suf === "b") return Math.round(base * 1_000_000_000);

  return Math.round(base);
}

/* =======================================================================================
   Small utils
======================================================================================= */

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
