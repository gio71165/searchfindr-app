// lib/onmarket/parsers/index.ts
import type { OnMarketParser } from "./types";
import { rssGenericParser } from "./rssGeneric";
import { sitemapGenericParser } from "./sitemapGeneric";
import { synergyHtmlParser } from "./synergyHtml";

export const PARSERS: Record<string, OnMarketParser> = {
  rss_generic: rssGenericParser,
  sitemap_generic: sitemapGenericParser,
  synergy_html: synergyHtmlParser,
};

export function getParser(parserKey: string): OnMarketParser {
  const parser = PARSERS[parserKey];
  if (!parser) {
    throw new Error(
      `Unknown parser_key "${parserKey}". Add it to lib/onmarket/parsers/index.ts`
    );
  }
  return parser;
}
