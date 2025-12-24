// lib/onmarket/parsers/synergyHtml.ts
import type { ExtractedFields, ListingStub, OnMarketParser, ParserInput } from "./types";

const BASE = "https://synergybb.com";

function decodeHtmlEntities(input: string) {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stripTags(input: string) {
  return input.replace(/<[^>]*>/g, " ");
}

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(href: string) {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${BASE}${href}`;
  return `${BASE}/${href}`;
}

function isSynergyListingUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname !== "synergybb.com") return false;
    return u.pathname.startsWith("/listings/");
  } catch {
    return false;
  }
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function extractAllHrefs(html: string) {
  const out: string[] = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

function extractH1(html: string) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  const text = normalizeWhitespace(stripTags(decodeHtmlEntities(m[1])));
  return text || null;
}

function extractMetaDescription(html: string) {
  const m = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["'][^>]*>/i
  );
  if (!m) return null;
  return normalizeWhitespace(decodeHtmlEntities(m[1])) || null;
}

function extractLocationBestEffort(html: string) {
  const text = normalizeWhitespace(stripTags(html));

  const locLabel = text.match(/Location:\s*([A-Za-z ,.-]{3,80})/i);
  if (locLabel?.[1]) return normalizeWhitespace(locLabel[1]);

  const cityState = text.match(
    /\b([A-Z][a-zA-Z.-]+(?:\s+[A-Z][a-zA-Z.-]+){0,3}),\s*([A-Z]{2})\b/
  );
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

function collectFinancialStrings(text: string): string[] {
  const t = text.toLowerCase();
  const hits: string[] = [];

  if (t.includes("annual revenue")) hits.push("Annual Revenue");
  else if (t.includes("revenue")) hits.push("Revenue");

  if (t.includes("ebitda")) hits.push("EBITDA");

  if (t.includes("net cash flow")) hits.push("Net Cash Flow");
  else if (t.includes("cash flow")) hits.push("Cash Flow");

  if (t.includes("seller discretionary earnings") || t.includes("sde")) hits.push("SDE");

  return unique(hits);
}

function getInputText(input: string | ParserInput) {
  return typeof input === "string" ? input : input.text;
}

export const synergyHtmlParser: OnMarketParser = {
  key: "synergy_html",

  async parseIndex(input: string | ParserInput): Promise<ListingStub[]> {
    const html = getInputText(input);

    const hrefs = extractAllHrefs(html)
      .map(toAbsoluteUrl)
      .filter(isSynergyListingUrl);

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
    const html = getInputText(input);

    const headline = extractH1(html) ?? extractMetaDescription(html) ?? null;

    // Cheap, resilient scan
    const text = normalizeWhitespace(stripTags(html));
    const locationText = extractLocationBestEffort(html);
    const state = guessStateFromLocationText(locationText);

    const extracted: ExtractedFields = {
      company_name: headline, // we’ll treat headline as company_name for MVP

      city: null,
      state: state ?? null,

      financials_strings: collectFinancialStrings(text),

      asking_price: null,
      teaser_pdf_url: null,

      industry_terms: [],
      deal_type_terms: [],

      raw: {
        location_text: locationText,
        meta_description: extractMetaDescription(html),
      },
    };

    return extracted;
  },
};
