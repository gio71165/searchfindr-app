// lib/onmarket/parsers/synergyHtml.ts
import type { ExtractedFields, ListingStub, OnMarketParser, ParserInput } from "./types";

/**
 * Generic HTML broker listings parser (Synergy, VR, Murphy).
 * Keep key = "synergy_html" to avoid DB migrations.
 *
 * V1 constraint here:
 * - Only collect HVAC/Plumbing/Electrical industry terms (no broad junk).
 * - Generate a clean text sample (remove scripts/styles/forms noise).
 */

function decodeHtmlEntities(input: string) {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&#8211;", "–")
    .replaceAll("&#8212;", "—")
    .replaceAll("&nbsp;", " ");
}

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

// Remove entire blocks that pollute visible text
function removeNoisyBlocks(html: string) {
  let out = html;

  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  out = out.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  out = out.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ");

  // common form-heavy chunks
  out = out.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, " ");

  return out;
}

function stripTags(input: string) {
  return input.replace(/<[^>]*>/g, " ");
}

function getInput(input: string | ParserInput): ParserInput {
  return typeof input === "string" ? { text: input } : input;
}

function extractAllHrefs(html: string) {
  const out: string[] = [];
  const re = /href\s*=\s*["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

function toAbsoluteUrl(href: string, baseUrl: string) {
  try {
    if (!href) return "";
    const h = href.trim();
    if (h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("tel:") || h.startsWith("javascript:")) {
      return "";
    }
    return new URL(h, baseUrl).toString();
  } catch {
    return "";
  }
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function hostOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function pathOf(u: string) {
  try {
    return new URL(u).pathname.toLowerCase();
  } catch {
    return "";
  }
}

function sameHost(urlA: string, urlB: string) {
  return hostOf(urlA) === hostOf(urlB);
}

/**
 * Host-aware listing URL filter (MVP):
 * - Default: require same host as entry_url
 * - Exception: VR network uses franchisee domains (vrdallas.com, vrmiamicenter.com, etc.)
 */
function isListingUrlForHost(absUrl: string, entryUrl: string) {
  if (!absUrl) return false;

  const entryHost = hostOf(entryUrl);
  const absHost = hostOf(absUrl);
  const p = pathOf(absUrl);

  // --- Cross-host allowance for VR franchise network ---
  let allowCrossHost = false;
  if (entryHost === "vrbusinessbrokers.com") {
    if (/^vr[a-z0-9-]+\.com$/i.test(absHost) && p.startsWith("/listing/")) {
      allowCrossHost = true;
    }
  }

  if (!sameHost(absUrl, entryUrl) && !allowCrossHost) return false;

  // --- Synergy ---
  if (entryHost === "synergybb.com") {
    return p.startsWith("/listings/");
  }

  // --- VR Business Brokers ---
  if (entryHost === "vrbusinessbrokers.com") {
    if (p.startsWith("/listing/") && p !== "/listing/") return true;
    if (p.startsWith("/businesses-for-sale/") && p !== "/businesses-for-sale/") return true;

    try {
      const u = new URL(absUrl);
      if (u.pathname.toLowerCase() === "/businesses-for-sale/" && u.search && /id=|listing|business/i.test(u.search)) {
        return true;
      }
    } catch {}

    if (allowCrossHost) return true;
    return false;
  }

  // --- Murphy Business ---
  if (entryHost === "murphybusiness.com") {
    if (p.includes("/businesses-for-sale/") && p !== "/businesses-for-sale/") return true;
    if (p.startsWith("/business/") && p !== "/business/") return true;
    if (p.includes("listing") || p.includes("business-for-sale") || p.includes("view-listing")) return true;
    return false;
  }

  // Default fallback
  const badPrefixes = ["/blog", "/news", "/about", "/contact", "/privacy", "/terms", "/category", "/tag", "/wp-"];
  if (badPrefixes.some((b) => p.startsWith(b))) return false;

  return /listing|business|for-sale|opportunity/i.test(p);
}

function extractH1(html: string) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  const text = normalizeWhitespace(stripTags(decodeHtmlEntities(m[1])));
  return text || null;
}

function extractMetaDescription(html: string) {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["'][^>]*>/i);
  if (!m) return null;
  return normalizeWhitespace(decodeHtmlEntities(m[1])) || null;
}

function extractLocationBestEffort(html: string) {
  const cleaned = removeNoisyBlocks(html);
  const text = normalizeWhitespace(stripTags(cleaned));

  const locLabel = text.match(/Location:\s*([A-Za-z ,.-]{3,80})/i);
  if (locLabel?.[1]) return normalizeWhitespace(locLabel[1]);

  const cityState = text.match(/\b([A-Z][a-zA-Z.-]+(?:\s+[A-Z][a-zA-Z.-]+){0,3}),\s*([A-Z]{2})\b/);
  if (cityState?.[0]) return cityState[0];

  return null;
}

function looksLikeStateAbbrev(s: string | null) {
  return !!s && /^[A-Z]{2}$/.test(s);
}

function guessStateFromLocationText(locationText: string | null) {
  if (!locationText) return null;
  const m = locationText.match(/\b([A-Z]{2})\b/);
  if (m?.[1] && looksLikeStateAbbrev(m[1])) return m[1];
  return null;
}

function findFirstUrl(html: string, endingRegex: RegExp): string | null {
  const urls = html.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  for (const u of urls) {
    if (endingRegex.test(u)) return u;
  }
  return null;
}

function extractFinancialLines(text: string): string[] {
  const lines = text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const keys = ["annual revenue", "revenue", "sales", "ebitda", "sde", "net income", "profit", "cash flow", "asking price"];

  const out: string[] = [];
  for (const line of lines) {
    const low = line.toLowerCase();
    if (keys.some((k) => low.includes(k))) out.push(line.slice(0, 260));
    if (out.length >= 14) break;
  }
  return out;
}

function v1IndustryTerms(text: string): string[] {
  const t = text.toLowerCase();
  const terms: string[] = [];

  const add = (term: string, cond: boolean) => {
    if (cond) terms.push(term);
  };

  // HVAC
  add("hvac", /\bhvac\b/.test(t));
  add("air conditioning", /\bair\s+conditioning\b/.test(t) || /\ba\/c\b/.test(t));
  add("heating", /\bheating\b/.test(t));
  add("refrigeration", /\brefrigeration\b/.test(t));
  add("ductwork", /\bduct(work|ing)?\b/.test(t));
  add("ventilation", /\bventilation\b/.test(t));
  add("furnace", /\bfurnace\b/.test(t));
  add("heat pump", /\bheat\s+pump\b/.test(t));
  add("boiler", /\bboiler\b/.test(t));

  // Plumbing
  add("plumbing", /\bplumb(ing|er|ers)\b/.test(t));
  add("drain cleaning", /\bdrain\s+clean(ing|er)\b/.test(t));
  add("sewer", /\bsewer\b/.test(t));
  add("septic", /\bseptic\b/.test(t));
  add("water heater", /\bwater\s+heater\b/.test(t));
  add("backflow", /\bbackflow\b/.test(t));

  // Electrical
  add("electrical", /\belectric(al|ian|ians)\b/.test(t));
  add("electrical contractor", /\belectrical\s+contract(or|ing)\b/.test(t));
  add("panel upgrade", /\bpanel\s+upgrade\b/.test(t));
  add("generator", /\bgenerator\b/.test(t));
  add("rewire", /\brewiring\b/.test(t) || /\brewired\b/.test(t));
  add("low voltage", /\blow[-\s]voltage\b/.test(t));
  add("ev charger", /\bev\s+charger\b/.test(t));

  return Array.from(new Set(terms));
}

function dealTypeTerms(text: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];

  const add = (k: string, cond: boolean) => {
    if (cond) out.push(k);
  };

  add("asset sale", /\basset\s+sale\b/.test(t) || /\basset\s+purchase\b/.test(t));
  add("stock sale", /\bstock\s+sale\b/.test(t) || /\bstock\s+purchase\b/.test(t));
  add("membership interest", /\bmembership\s+interest\b/.test(t));

  return Array.from(new Set(out));
}

/**
 * Build a high-signal text sample:
 * - remove scripts/styles/noscript/forms first
 * - decode entities
 * - strip tags
 * - then take a chunk likely to include listing body, not header junk
 */
function textSample(html: string, maxLen = 5000) {
  const cleaned = decodeHtmlEntities(removeNoisyBlocks(html));
  const text = normalizeWhitespace(stripTags(cleaned));
  if (!text) return "";

  const anchors = ["Listing Details", "Business Description", "Overview", "Financial", "Annual Revenue", "EBITDA", "Asking Price", "Location"];
  const lower = text.toLowerCase();

  let bestIdx = -1;
  for (const a of anchors) {
    const idx = lower.indexOf(a.toLowerCase());
    if (idx !== -1) {
      bestIdx = idx;
      break;
    }
  }

  if (bestIdx !== -1) {
    const start = Math.max(0, bestIdx - 1400);
    return text.slice(start, start + maxLen);
  }

  // Fallback: take the middle chunk (header nav often dominates the beginning)
  if (text.length > maxLen) {
    const start = Math.floor(Math.max(0, (text.length - maxLen) / 2));
    return text.slice(start, start + maxLen);
  }

  return text.slice(0, maxLen);
}

export const synergyHtmlParser: OnMarketParser = {
  key: "synergy_html",

  async parseIndex(input: string | ParserInput): Promise<ListingStub[]> {
    const inObj = getInput(input);
    const html = inObj.text;
    const baseUrl = inObj.url ?? "https://example.com/";

    const hrefs = extractAllHrefs(html)
      .map((h) => toAbsoluteUrl(h, baseUrl))
      .filter(Boolean)
      .filter((u) => isListingUrlForHost(u, baseUrl));

    const listingUrls = unique(hrefs);

    return listingUrls.map((listing_url) => ({
      listing_url,
      title: null,
      maybe_date: null,
      maybe_location: null,
      maybe_price: null,
    }));
  },

  async parseDetail(input: string | ParserInput): Promise<ExtractedFields> {
    const inObj = getInput(input);
    const html = inObj.text;

    const headline = extractH1(html) ?? extractMetaDescription(html) ?? null;

    const sample = textSample(html, 5000);
    const locationText = extractLocationBestEffort(html);
    const state = guessStateFromLocationText(locationText);

    const teaserPdf = findFirstUrl(html, /\.pdf(\?.*)?$/i);

    const extracted: ExtractedFields = {
      company_name: headline,
      city: null,
      state: state ?? null,

      // Financial strings from real text sample
      financials_strings: extractFinancialLines(sample),

      asking_price: null,
      teaser_pdf_url: teaserPdf ?? null,

      // ✅ V1 ONLY
      industry_terms: v1IndustryTerms(sample),
      deal_type_terms: dealTypeTerms(sample),

      raw: {
        location_text: locationText,
        meta_description: extractMetaDescription(html),
        text_sample: sample,
      },
    };

    return extracted;
  },
};
