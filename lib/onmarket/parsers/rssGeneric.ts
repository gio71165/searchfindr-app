// lib/onmarket/parsers/rssGeneric.ts
import type { ExtractedFields, ListingStub, OnMarketParser } from "./types";

/**
 * V1 RSS parser (HVAC/Plumbing/Electrical only):
 * - parseIndex: parse RSS XML into listing stubs (url/title/date)
 * - parseDetail: conservative text sample + V1 term hits + optional PDF URL
 *
 * Intentionally conservative: do NOT invent numbers.
 */
export const rssGenericParser: OnMarketParser = {
  key: "rss_generic",

  async parseIndex(input) {
    const xml = typeof input === "string" ? input : input.text;

    const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

    const stubs: ListingStub[] = items
      .map((item) => {
        const link = matchTag(item, "link")?.trim();
        const title = matchTag(item, "title")?.trim();
        const pubDate = matchTag(item, "pubDate")?.trim() ?? matchTag(item, "published")?.trim();

        if (!link) return null;

        return {
          listing_url: sanitizeUrl(link),
          title: title || null,
          maybe_date: pubDate ? safeDate(pubDate) : null,
          maybe_location: null,
          maybe_price: null,
        } satisfies ListingStub;
      })
      .filter(Boolean) as ListingStub[];

    const seen = new Set<string>();
    return stubs.filter((s) => {
      const k = s.listing_url;
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },

  async parseDetail(input) {
    const html = typeof input === "string" ? input : input.text;
    const text = stripHtml(html);

    const teaserPdf = findFirstUrl(html, /\.pdf(\?.*)?$/i);

    const extracted: ExtractedFields = {
      company_name: null,
      city: null,
      state: null,

      financials_strings: extractFinancialLines(text),
      asking_price: null,

      teaser_pdf_url: teaserPdf ?? null,

      // ✅ V1 only terms
      industry_terms: v1IndustryTerms(text),

      // Deal type hints (very light)
      deal_type_terms: keywordHits(text, ["asset sale", "stock sale", "membership interest"]),

      raw: {
        text_sample: text.slice(0, 2000),
      },
    };

    return extracted;
  },
};

/* ----------------------------- helpers ----------------------------- */

function matchTag(xmlChunk: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xmlChunk.match(re);
  if (!m) return null;
  return decodeXml(m[1]);
}

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

function sanitizeUrl(u: string): string {
  return u.replace(/\s+/g, "");
}

function safeDate(s: string): string | null {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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

/**
 * ✅ V1-only term extraction. We keep this broad enough to catch real pages
 * but ONLY for HVAC/Plumbing/Electrical.
 */
function v1IndustryTerms(text: string): string[] {
  const t = text.toLowerCase();
  const terms: string[] = [];

  const add = (term: string, cond: boolean) => {
    if (cond) terms.push(term);
  };

  // HVAC
  add("hvac", /\bhvac\b/.test(t));
  add("heating", /\bheating\b/.test(t));
  add("air conditioning", /\bair\s+conditioning\b/.test(t) || /\ba\/c\b/.test(t));
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
  add("pipe repair", /\bpipe\b/.test(t) && /\brepair\b/.test(t));

  // Electrical
  add("electrical", /\belectric(al|ian|ians)\b/.test(t));
  add("electrical contractor", /\belectrical\s+contract(or|ing)\b/.test(t));
  add("panel upgrade", /\bpanel\s+upgrade\b/.test(t));
  add("generator", /\bgenerator\b/.test(t));
  add("rewire", /\brewiring\b/.test(t) || /\brewired\b/.test(t));
  add("low voltage", /\blow[-\s]voltage\b/.test(t));
  add("ev charger", /\bev\s+charger\b/.test(t));

  // Dedup & return
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
    if (keys.some((k) => low.includes(k))) {
      out.push(line.slice(0, 240));
    }
    if (out.length >= 12) break;
  }
  return out;
}
