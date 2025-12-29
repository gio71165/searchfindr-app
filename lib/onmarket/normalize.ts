// lib/onmarket/normalize.ts
import type { ExtractedFields, ListingStub } from "./parsers/types";

/**
 * V1: HARD LOCK — ONLY these industries are allowed.
 * Everything else must end up NULL.
 */
export type V1IndustryTag = "HVAC" | "Plumbing" | "Electrical";

export type NormalizedDeal = {
  company_name: string | null;
  headline: string;

  // ✅ V1 only
  industry_tag: V1IndustryTag | null;
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
  confidence_score: number; // internal only

  published_at: string | null; // ISO if known

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
 * - Prefer labeled values (Annual Revenue, EBITDA, Cash Flow, Price).
 * - Only set industry when we’re confident.
 * - data_confidence is completeness-based (not “AI vibes”).
 * - V1: ONLY HVAC/Plumbing/Electrical are allowed.
 */
export function normalizeDeal(input: NormalizeInput): NormalizedDeal {
  const { sourceName, sourceUrl, listing, extracted } = input;

  // Best available headline
  const headline = cleanText(listing.title || extracted?.company_name || "On-market listing");

  const company_name = extracted?.company_name ? cleanText(extracted.company_name) : null;

  const loc = normalizeLocation(extracted?.city ?? null, extracted?.state ?? null);

  // Best-effort text sample from parser (safe if missing)
  const textSample = String((extracted as any)?.raw?.text_sample ?? "");

  // Build a blob for classification
  const industryTermsBlob: string[] = [
    ...((extracted?.industry_terms ?? []).map((x) => String(x)) ?? []),
    String(sourceName ?? ""),
    String(sourceUrl ?? ""),
    String(listing.title ?? ""),
    String(extracted?.company_name ?? ""),
    String(headline ?? ""),
    String(textSample ?? ""),
  ];

  // ✅ Industry: prefer sourceName override if it’s one of your “broker - industry” sources
  const sourceIndustry = industryFromSourceName(sourceName);
  const industry = sourceIndustry.tag ? sourceIndustry : mapIndustry(industryTermsBlob);

  const deal_type = mapDealType(extracted?.deal_type_terms ?? []);

  const has_teaser_pdf = Boolean(extracted?.teaser_pdf_url);

  // --- Financial parsing (strict) ---
  const finText = [textSample, ...(extracted?.financials_strings ?? [])].join("\n");

  const labeled = parseLabeledFinancials(finText);
  const revenueRange =
    labeled.revenue ?? extractRangeStrict(finText, ["annual revenue", "revenue", "sales", "gross revenue", "total revenue"]);
  const ebitdaRange =
    labeled.ebitda ??
    extractRangeStrict(finText, ["ebitda", "net cash flow", "cash flow", "sde", "seller discretionary earnings"]);

  const revenue_min = revenueRange?.min ?? null;
  const revenue_max = revenueRange?.max ?? null;
  const ebitda_min = ebitdaRange?.min ?? null;
  const ebitda_max = ebitdaRange?.max ?? null;

  const revenue_band = deriveRevenueBand(revenue_min, revenue_max);
  const ebitda_band = deriveEbitdaBand(ebitda_min, ebitda_max);

  // Asking price: only if extracted explicitly; otherwise try labeled parse
  const asking_price = extracted?.asking_price ?? labeled.asking_price ?? null;

  const { confidence_score, data_confidence } = computeConfidence({
    hasCompany: Boolean(company_name),
    hasHeadline: Boolean(headline),
    hasIndustry: Boolean(industry.tag),
    hasGeo: Boolean(loc.state || loc.city),
    hasAnyFinancial: Boolean(revenue_min || revenue_max || ebitda_min || ebitda_max),
    hasAskingPrice: Boolean(asking_price),
    hasTeaser: has_teaser_pdf,
    hasTextSample: textSample.trim().length >= 200,
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
    confidence_score,

    published_at: listing.maybe_date ?? null,

    debug: {
      headline_used: headline,
      text_sample_len: textSample.length,
      source_industry_override: sourceIndustry.tag ? true : false,
      industry_blob_sample: buildIndustryBlob(industryTermsBlob).slice(0, 700),
      labeled_financials: labeled,
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
  hasTextSample: boolean;
}): { confidence_score: number; data_confidence: "high" | "medium" | "low" } {
  let score = 0;

  if (input.hasHeadline) score += 15;
  if (input.hasCompany) score += 15;
  if (input.hasIndustry) score += 15;
  if (input.hasGeo) score += 15;

  if (input.hasAnyFinancial) score += 20;
  if (input.hasAskingPrice) score += 10;
  if (input.hasTeaser) score += 10;

  if (input.hasTextSample) score += 5;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let data_confidence: "high" | "medium" | "low" = "low";
  if (score >= 75) data_confidence = "high";
  else if (score >= 45) data_confidence = "medium";

  return { confidence_score: score, data_confidence };
}

/* =======================================================================================
   Industry mapping (V1 ONLY)
======================================================================================= */

type IndustryTag = V1IndustryTag;

function industryFromSourceName(sourceName: string): { tag: IndustryTag | null; confidence: number } {
  const s = (sourceName ?? "").toLowerCase();

  // If you add “broker - hvac” etc, these will force tag with high confidence:
  if (s.includes(" - hvac")) return { tag: "HVAC", confidence: 95 };
  if (s.includes(" - electrical")) return { tag: "Electrical", confidence: 95 };
  if (s.includes(" - plumbing")) return { tag: "Plumbing", confidence: 95 };

  return { tag: null, confidence: 0 };
}

function buildIndustryBlob(terms: string[]): string {
  return terms
    .filter((x) => x !== null && x !== undefined)
    .map((x) => String(x).toLowerCase())
    .join(" | ");
}

function countHits(blob: string, keys: string[]) {
  let hits = 0;
  for (const k of keys) {
    if (!k) continue;
    if (blob.includes(k)) hits += 1;
  }
  return hits;
}

function mapIndustry(terms: string[]): { tag: IndustryTag | null; confidence: number } {
  const blob = buildIndustryBlob(terms);

  const excludes = (keys: string[]) => keys.some((k) => blob.includes(k));

  const rules: Array<{
    tag: IndustryTag;
    strong: string[];
    weak: string[];
    exclude?: string[];
  }> = [
    {
      tag: "HVAC",
      strong: [
        "hvac",
        "heating and air",
        "heating & air",
        "air conditioning",
        "air-conditioning",
        "furnace",
        "heat pump",
        "refrigeration",
        "ductwork",
        "ventilation",
        "mechanical contractor",
        "chiller",
        "boiler",
      ],
      weak: ["ac repair", "a/c", "thermostat", "maintenance plan", "service agreement", "indoor air quality", "iaq"],
      exclude: ["auto", "car dealership", "vehicle"],
    },
    {
      tag: "Plumbing",
      strong: ["plumbing", "plumber", "drain cleaning", "sewer", "septic", "water heater", "backflow", "rooter"],
      weak: ["pipe", "piping", "leak", "fixture", "toilet", "faucet"],
      exclude: ["software", "saas"],
    },
    {
      tag: "Electrical",
      strong: ["electrical contractor", "electrician", "electrical", "panel upgrade", "rewire", "generator", "low voltage", "low-voltage"],
      weak: ["lighting retrofit", "ev charger", "alarm", "security system", "smart home"],
      exclude: ["electronics manufacturing", "semiconductor"],
    },
  ];

  let best: { tag: IndustryTag; score: number } | null = null;

  for (const r of rules) {
    if (r.exclude && excludes(r.exclude)) continue;

    const strongHits = countHits(blob, r.strong);
    const weakHits = countHits(blob, r.weak);

    const qualifies = strongHits >= 1 || weakHits >= 2;
    if (!qualifies) continue;

    let score = strongHits * 35 + weakHits * 12;
    if (strongHits >= 2) score += 10;
    if (score > 100) score = 100;

    if (!best || score > best.score) best = { tag: r.tag, score };
  }

  if (!best) return { tag: null, confidence: 0 };

  const confidence = Math.max(0, Math.min(100, Math.round(best.score)));
  if (confidence < 55) return { tag: null, confidence: 0 };

  return { tag: best.tag, confidence };
}

/* =======================================================================================
   Deal type mapping
======================================================================================= */

function mapDealType(terms: string[]): "asset" | "stock" | "unknown" {
  const t = (terms ?? []).map((x) => String(x).toLowerCase());
  if (t.some((x) => x.includes("asset"))) return "asset";
  if (t.some((x) => x.includes("stock") || x.includes("membership"))) return "stock";
  return "unknown";
}

/* =======================================================================================
   Location normalization
======================================================================================= */

function normalizeLocation(city: string | null, state: string | null): { city: string | null; state: string | null } {
  const c = city ? cleanText(city) : null;
  const s = state ? cleanText(state).toUpperCase() : null;

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
   Financial parsing (STRICT)
======================================================================================= */

function parseLabeledFinancials(text: string): {
  revenue: { min: number; max: number } | null;
  ebitda: { min: number; max: number } | null;
  asking_price: number | null;
} {
  const t = text.replace(/\u00a0/g, " "); // nbsp

  const asking = parseFirstLabeledMoney(t, ["price", "asking price", "purchase price", "list price"]) ?? null;

  const rev = parseFirstLabeledRangeOrSingle(t, ["annual revenue", "revenue", "sales"]) ?? null;

  const ebitda =
    parseFirstLabeledRangeOrSingle(t, ["ebitda", "net cash flow", "cash flow", "sde", "seller discretionary earnings"]) ?? null;

  return { revenue: rev, ebitda, asking_price: asking };
}

function parseFirstLabeledMoney(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const re = new RegExp(`${escapeReg(label)}\\s*[:\\-]?\\s*([^\\n\\r]{0,80})`, "i");
    const m = text.match(re);
    if (!m?.[1]) continue;

    const chunk = m[1];
    const v = parseSingleMoneyStrict(chunk);
    if (v !== null) return v;
  }
  return null;
}

function parseFirstLabeledRangeOrSingle(text: string, labels: string[]): { min: number; max: number } | null {
  for (const label of labels) {
    const re = new RegExp(`${escapeReg(label)}\\s*[:\\-]?\\s*([^\\n\\r]{0,120})`, "i");
    const m = text.match(re);
    if (!m?.[1]) continue;

    const chunk = m[1];

    const range = parseMoneyRangeStrict(chunk);
    if (range) return range;

    const single = parseSingleMoneyStrict(chunk);
    if (single !== null) return { min: single, max: single };
  }
  return null;
}

function extractRangeStrict(text: string, keywords: string[]): { min: number; max: number } | null {
  const lower = text.toLowerCase();
  const hits: string[] = [];

  for (const k of keywords) {
    let idx = lower.indexOf(k);
    while (idx !== -1) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(lower.length, idx + 220);
      hits.push(text.slice(start, end));
      idx = lower.indexOf(k, idx + k.length);
    }
  }
  if (hits.length === 0) return null;

  for (const chunk of hits) {
    if (!looksMoneyLike(chunk)) continue;

    const range = parseMoneyRangeStrict(chunk);
    if (range) return range;

    const single = parseSingleMoneyStrict(chunk);
    if (single !== null) return { min: single, max: single };
  }

  return null;
}

function looksMoneyLike(s: string) {
  const t = s.toLowerCase();
  return /\$/.test(s) || /\bmillion\b/.test(t) || /\b(k|m)\b/.test(t) || /[0-9],[0-9]{3}/.test(s);
}

function parseMoneyRangeStrict(s: string): { min: number; max: number } | null {
  const re =
    /\$?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?)\s*([KkMmBb]|million)?\s*(?:-|to)\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?)\s*([KkMmBb]|million)?/;
  const m = s.match(re);
  if (!m) return null;

  const a = parseMoneyStrict(m[1], m[2]);
  const b = parseMoneyStrict(m[3], m[4]);
  if (a === null || b === null) return null;

  return { min: Math.min(a, b), max: Math.max(a, b) };
}

function parseSingleMoneyStrict(s: string): number | null {
  if (!looksMoneyLike(s)) return null;

  const re = /\$?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?)\s*([KkMmBb]|million)?/;
  const m = s.match(re);
  if (!m) return null;

  return parseMoneyStrict(m[1], m[2]);
}

function parseMoneyStrict(numRaw: string, suffixRaw?: string): number | null {
  const base = Number(String(numRaw).replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;

  const suf = String(suffixRaw ?? "").toLowerCase();
  if (suf === "k") return Math.round(base * 1_000);
  if (suf === "m") return Math.round(base * 1_000_000);
  if (suf === "b") return Math.round(base * 1_000_000_000);
  if (suf === "million") return Math.round(base * 1_000_000);

  return Math.round(base);
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* =======================================================================================
   Small utils
======================================================================================= */

function cleanText(s: string): string {
  return String(s).replace(/\s+/g, " ").trim();
}
