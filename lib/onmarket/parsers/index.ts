// lib/onmarket/parsers/index.ts
import type { OnMarketParser } from "./types";
import { synergyHtmlParser } from "./synergyHtml";
import { rssGenericParser } from "./rssGeneric";
import { sitemapGenericParser } from "./sitemapGeneric";

export const PARSERS: Record<string, OnMarketParser> = {
  synergy_html: synergyHtmlParser,
  rss_generic: rssGenericParser,
  sitemap_generic: sitemapGenericParser,
};

export function getParser(parserKey: string): OnMarketParser {
  const parser = PARSERS[parserKey];
  if (!parser) {
    throw new Error(`Unknown parser_key "${parserKey}". Check on_market_sources.parser_key`);
  }
  return parser;
}
