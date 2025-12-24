// lib/onmarket/parsers/rssGeneric.ts
import type { ExtractedFields, ListingStub, OnMarketParser } from "./types";

/**
 * MVP RSS parser:
 * - parseIndex: parse RSS XML into listing stubs (url/title/date)
 * - parseDetail: very conservative heuristics on HTML (optional)
 *
 * Notes:
 * - We keep this intentionally conservative.
 * - Real broker sites will likely need custom parsers later.
 */
export const rssGenericParser: OnMarketParser = {
  key: "rss_generic",

  async parseIndex(input) {
    const xml = typeof input === "string" ? input : input.text;

    // super-light XML parsing without external deps:
    // We extract <item> blocks, then pull common tags.
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

    // Dedup by URL
    const seen = new Set<string>();
    return stubs.filter((s) => {
      const k = s.listing_url;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },

  async parseDetail(input) {
    // This is optional for RSS-only sources. If you don't fetch detail pages in MVP,
    // you can just return minimal extracted fields.
    const html = typeof input === "string" ? input : input.text;

    // Very conservative extraction:
    const text = stripHtml(html);

    const teaserPdf = findFirstUrl(html, /\.pdf(\?.*)?$/i);

    const extracted: ExtractedFields = {
      company_name: null,
      city: null,
      state: null,
      financials_strings: [],
      asking_price: null,
      teaser_pdf_url: teaserPdf ?? null,
      industry_terms: [],
      deal_type_terms: [],
      raw: {
        text_sample: text.slice(0, 2000),
      },
    };

    // Industry terms: extremely basic keyword capture (MVP)
    // (Normalization will map to industry_tag later.)
    const industryHits = keywordHits(text, [
      "hvac",
      "plumbing",
      "electrical",
      "construction",
      "manufacturing",
      "software",
      "saas",
      "healthcare",
      "dental",
      "auto repair",
      "logistics",
      "transportation",
      "landscaping",
    ]);
    extracted.industry_terms = industryHits;

    // Deal type hints
    extracted.deal_type_terms = keywordHits(text, ["asset sale", "stock sale", "membership interest"]);

    // Asking price (very rough)
    const price = extractMoney(text);
    if (price !== null) extracted.asking_price = price;

    // Financials strings: pull lines that include revenue/ebitda/net income keywords
    extracted.financials_strings = extractFinancialLines(text);

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
    if (t.includes(k.toLowerCase())) hits.push(k);
  }
  return hits;
}

function findFirstUrl(html: string, endingRegex: RegExp): string | null {
  // crude URL scan
  const urls = html.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  for (const u of urls) {
    if (endingRegex.test(u)) return u;
  }
  return null;
}

function extractMoney(text: string): number | null {
  // Matches: $1,234,567 or 1,234,567 or 1.2M (very rough)
  const m = text.match(/\$\s?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?)(\s?[MBmb])?/);
  if (!m) return null;

  const raw = m[1].replace(/,/g, "");
  const suffix = (m[2] ?? "").trim().toLowerCase();

  const base = Number(raw);
  if (!Number.isFinite(base)) return null;

  if (suffix === "m") return Math.round(base * 1_000_000);
  if (suffix === "b") return Math.round(base * 1_000_000_000);

  return Math.round(base);
}

function extractFinancialLines(text: string): string[] {
  const lines = text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const keys = ["revenue", "sales", "ebitda", "sde", "net income", "profit", "cash flow"];

  const out: string[] = [];
  for (const line of lines) {
    const low = line.toLowerCase();
    if (keys.some((k) => low.includes(k))) {
      // Keep it short
      out.push(line.slice(0, 240));
    }
    if (out.length >= 10) break;
  }
  return out;
}
