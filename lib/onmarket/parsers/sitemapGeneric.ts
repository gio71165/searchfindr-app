// lib/onmarket/parsers/sitemapGeneric.ts
import type { ExtractedFields, ListingStub, OnMarketParser } from "./types";

/**
 * Sitemap parser (MVP):
 * - parseIndex: extracts <loc> URLs
 * - parseDetail: conservative text sample + V1 term hits
 *
 * This is intentionally conservative — normalization decides what to trust.
 */
export const sitemapGenericParser: OnMarketParser = {
  key: "sitemap_generic",

  async parseIndex(input) {
    const xml = typeof input === "string" ? input : input.text;

    const locs = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((m) => decodeXml(m[1]).trim());

    const stubs: ListingStub[] = locs
      .filter(Boolean)
      .map((u) => ({
        listing_url: sanitizeUrl(u),
        title: null,
        maybe_date: null,
        maybe_location: null,
        maybe_price: null,
      }));

    const seen = new Set<string>();
    return stubs.filter((s) => {
      if (!s.listing_url) return false;
      if (seen.has(s.listing_url)) return false;
      seen.add(s.listing_url);
      return true;
    });
  },

  async parseDetail(input) {
    const html = typeof input === "string" ? input : input.text;
    const text = stripHtml(html);

    const extracted: ExtractedFields = {
      company_name: null,
      city: null,
      state: null,

      financials_strings: extractFinancialLines(text),
      asking_price: null,

      teaser_pdf_url: findFirstUrl(html, /\.pdf(\?.*)?$/i) ?? null,

      // ✅ V1 only
      industry_terms: v1IndustryTerms(text),
      deal_type_terms: keywordHits(text, ["asset sale", "stock sale", "membership interest"]),

      raw: {
        text_sample: text.slice(0, 2000),
      },
    };

    return extracted;
  },
};

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function sanitizeUrl(u: string): string {
  return u.replace(/\s+/g, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordHits(text: string, keywords: string[]): string[] {
  const t = text.toLowerCase();
  const hits: string[] = [];
  for (const k of keywords) {
    if (!k) continue;
    if (t.includes(k.toLowerCase())) hits.push(k);
  }
  return hits;
}

function findFirstUrl(html: string, endingRegex: RegExp): string | null {
  const urls = html.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  for (const u of urls) {
    if (endingRegex.test(u)) return u;
  }
  return null;
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
  add("heat pump", /\bheat\s+pump\b/.test(t));
  add("furnace", /\bfurnace\b/.test(t));
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

function extractFinancialLines(text: string): string[] {
  const lines = text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const keys = ["annual revenue", "revenue", "sales", "ebitda", "sde", "net income", "profit", "cash flow"];

  const out: string[] = [];
  for (const line of lines) {
    const low = line.toLowerCase();
    if (keys.some((k) => low.includes(k))) out.push(line.slice(0, 240));
    if (out.length >= 12) break;
  }
  return out;
}
