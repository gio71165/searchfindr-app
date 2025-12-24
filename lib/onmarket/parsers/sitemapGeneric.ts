// lib/onmarket/parsers/sitemapGeneric.ts
import type { ExtractedFields, ListingStub, OnMarketParser } from "./types";

export const sitemapGenericParser: OnMarketParser = {
  key: "sitemap_generic",

  async parseIndex(input) {
    const xml = typeof input === "string" ? input : input.text;

    // Grab <loc> URLs from sitemap
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

    // Dedup
    const seen = new Set<string>();
    return stubs.filter((s) => {
      if (seen.has(s.listing_url)) return false;
      seen.add(s.listing_url);
      return true;
    });
  },

  async parseDetail(input) {
    // Conservative baseline; you’ll add custom parsers later.
    const html = typeof input === "string" ? input : input.text;

    const extracted: ExtractedFields = {
      company_name: null,
      city: null,
      state: null,
      financials_strings: [],
      asking_price: null,
      teaser_pdf_url: null,
      industry_terms: [],
      deal_type_terms: [],
      raw: {
        text_sample: stripHtml(html).slice(0, 2000),
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
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
