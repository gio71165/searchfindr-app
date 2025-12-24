// lib/onmarket/parsers/types.ts

/**
 * A minimal stub discovered from an index page (RSS / sitemap / directory listing).
 * This is what we store into `on_market_raw_listings` before we fetch details.
 */
export type ListingStub = {
  listing_url: string; // absolute URL to detail page
  title: string | null;

  // Optional hints (not required for MVP)
  maybe_date: string | null; // ISO string preferred
  maybe_location: string | null;
  maybe_price: string | null;
};

/**
 * Conservative extracted fields from the detail page.
 * Keep this raw-ish; normalization happens later.
 */
export type ExtractedFields = {
  company_name: string | null;

  city: string | null;
  state: string | null; // e.g. "TX" if known, otherwise null

  // Financial signals should remain RAW strings here; normalization decides what to trust.
  financials_strings: string[];

  // If a numeric asking price is explicitly present, put it here. Otherwise null.
  asking_price: number | null;

  teaser_pdf_url: string | null;

  // Raw industry words/phrases; normalization maps this to your canonical tags.
  industry_terms: string[];

  // Phrases like "asset sale" / "stock sale"
  deal_type_terms: string[];

  // Any extra debug/trace fields
  raw?: Record<string, unknown>;
};

/**
 * Parser input lets us pass either plain strings or richer objects later.
 * For MVP we mostly use `text`.
 */
export type ParserInput = {
  url?: string;
  text: string;
  contentType?: string;
  fetchedAt?: string; // ISO string
};

/**
 * A parser module contract.
 * Each `parser_key` in `on_market_sources` must map to one of these parsers.
 */
export type OnMarketParser = {
  key: string;

  /**
   * Parse the "index" source (RSS feed, sitemap xml, HTML directory page)
   * and return discovered listing URLs (+ minimal metadata).
   */
  parseIndex: (input: string | ParserInput) => Promise<ListingStub[]>;

  /**
   * Parse a detail listing page and return extracted structured fields.
   * If a source does not require detail parsing for MVP, you can return minimal fields.
   */
  parseDetail: (input: string | ParserInput) => Promise<ExtractedFields>;
};
