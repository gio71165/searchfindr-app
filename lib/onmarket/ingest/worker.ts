// lib/onmarket/ingest/worker.ts

import crypto from "crypto";
import { getParser } from "../parsers";
import type { ListingStub } from "../parsers/types";
import { normalizeDeal } from "../normalize";

// Minimal shape of the supabase client we use here
type SupabaseAdmin = {
  from: (table: string) => any;
};

type IngestResult = {
  sourcesProcessed: number;
  sourcesSkipped: number;
  rawSeen: number;
  rawNew: number;
  rawChanged: number;
  detailFetched: number;
  promotedDeals: number;
  heldDeals: number;
  errors: Array<{ sourceId?: string; sourceName?: string; where: string; message: string }>;
};

export async function runOnMarketIngestion(args: {
  supabaseAdmin: SupabaseAdmin;
  fetchFn?: typeof fetch;
  maxSourcesPerRun?: number;
  maxListingsPerSource?: number;
}): Promise<IngestResult> {
  const supabaseAdmin = args.supabaseAdmin;
  const fetchFn = args.fetchFn ?? fetch;
  const maxSourcesPerRun = args.maxSourcesPerRun ?? 20;
  const maxListingsPerSource = args.maxListingsPerSource ?? 50;

  const result: IngestResult = {
    sourcesProcessed: 0,
    sourcesSkipped: 0,
    rawSeen: 0,
    rawNew: 0,
    rawChanged: 0,
    detailFetched: 0,
    promotedDeals: 0,
    heldDeals: 0,
    errors: [],
  };

  const now = new Date();
  const today = isoDate(now); // YYYY-MM-DD

  // ✅ DEBUG: Increase default cap while testing (was 10)
  await ensureDailyCapRow(supabaseAdmin, today, 1000);

  // Pull enabled sources
  const { data: sources, error: sourcesErr } = await supabaseAdmin
    .from("on_market_sources")
    .select("*")
    .eq("is_enabled", true)
    .limit(maxSourcesPerRun);

  if (sourcesErr) {
    throw new Error(`Failed to load on_market_sources: ${sourcesErr.message}`);
  }

  for (const source of sources ?? []) {
    const due = isSourceDue(source, now);
    if (!due) {
      result.sourcesSkipped += 1;
      continue;
    }

    result.sourcesProcessed += 1;

    try {
      const parser = getParser(source.parser_key);

      // polite-ish: rate limit per source by spacing requests (MVP)
      // We still keep it simple; real worker should use a per-domain scheduler.
      const entryRes = await safeFetch(fetchFn, source.entry_url, {
        headers: { "User-Agent": "SearchFindrBot/0.1 (+on-market-indexer)" },
      });

      if (!entryRes.ok) {
        await markSourceCrawl(supabaseAdmin, source.id, now.toISOString());
        result.errors.push({
          sourceId: source.id,
          sourceName: source.name,
          where: "fetch entry_url",
          message: `HTTP ${entryRes.status}`,
        });
        continue;
      }

      const entryText = await entryRes.text();

      let stubs: ListingStub[] = [];
      try {
        stubs = await parser.parseIndex({
          url: source.entry_url,
          text: entryText,
          contentType: entryRes.headers.get("content-type") ?? undefined,
          fetchedAt: now.toISOString(),
        });
      } catch (e: any) {
        await markSourceCrawl(supabaseAdmin, source.id, now.toISOString());
        result.errors.push({
          sourceId: source.id,
          sourceName: source.name,
          where: "parseIndex",
          message: e?.message ?? String(e),
        });
        continue;
      }

      stubs = stubs.slice(0, maxListingsPerSource);
      result.rawSeen += stubs.length;

      for (const stub of stubs) {
        // ✅ Filter out blog/articles by URL shape (prevents “random articles”)
        if (!stub.listing_url || !stub.listing_url.includes("/listings/")) continue;

        const checksum = hashChecksum({
          title: stub.title ?? "",
          maybe_date: stub.maybe_date ?? "",
          maybe_location: stub.maybe_location ?? "",
          maybe_price: stub.maybe_price ?? "",
        });

        // Look for existing raw row
        const { data: existingRaw, error: existingErr } = await supabaseAdmin
          .from("on_market_raw_listings")
          .select("id, checksum, status")
          .eq("source_id", source.id)
          .eq("listing_url", stub.listing_url)
          .maybeSingle();

        if (existingErr) {
          result.errors.push({
            sourceId: source.id,
            sourceName: source.name,
            where: "select raw existing",
            message: existingErr.message,
          });
          continue;
        }

        const isNew = !existingRaw;
        const isChanged = !!existingRaw && existingRaw.checksum !== checksum;

        if (isNew) result.rawNew += 1;
        if (isChanged) result.rawChanged += 1;

        // Upsert raw listing
        const payload = {
          stub,
        };

        const upsertPayload = {
          source_id: source.id,
          listing_url: stub.listing_url,
          title_raw: stub.title,
          snippet_raw: null,
          payload_json: payload,
          checksum,
          last_seen_at: now.toISOString(),
          status: isChanged ? "changed" : "active",
          last_fetch_error: null,
        };

        const { data: upsertedRaw, error: upsertErr } = await supabaseAdmin
          .from("on_market_raw_listings")
          .upsert(upsertPayload, { onConflict: "source_id,listing_url" })
          .select("id")
          .single();

        if (upsertErr) {
          result.errors.push({
            sourceId: source.id,
            sourceName: source.name,
            where: "upsert raw listing",
            message: upsertErr.message,
          });
          continue;
        }

        const rawId = upsertedRaw?.id ?? existingRaw?.id;
        if (!rawId) continue;

        // ✅ DEBUG MODE: ALWAYS fetch detail, even if unchanged
        // This makes debugging MUCH easier.
        //
        // Production behavior (previously) was:
        // if (!isNew && !isChanged) { touchDealLastSeen(); continue; }
        //
        // We will still touch last_seen, but we won't "continue" while debugging.
        if (!isNew && !isChanged) {
          await touchDealLastSeen(supabaseAdmin, rawId, now.toISOString());
          // NOTE: do NOT continue — fall through to fetch detail
        }

        // Fetch detail page and parse
        let extracted = null as any;

        try {
          const detailRes = await safeFetch(fetchFn, stub.listing_url, {
            headers: { "User-Agent": "SearchFindrBot/0.1 (+on-market-indexer)" },
          });

          if (!detailRes.ok) {
            await supabaseAdmin
              .from("on_market_raw_listings")
              .update({ last_fetch_error: `HTTP ${detailRes.status}` })
              .eq("id", rawId);

            result.errors.push({
              sourceId: source.id,
              sourceName: source.name,
              where: "fetch detail",
              message: `HTTP ${detailRes.status}`,
            });
            continue;
          }

          const html = await detailRes.text();
          extracted = await parser.parseDetail({
            url: stub.listing_url,
            text: html,
            contentType: detailRes.headers.get("content-type") ?? undefined,
            fetchedAt: now.toISOString(),
          });

          result.detailFetched += 1;

          // Store extraction for traceability/debugging
          await supabaseAdmin
            .from("on_market_raw_listings")
            .update({
              payload_json: {
                stub,
                extracted,
              },
              last_fetch_error: null,
              last_seen_at: now.toISOString(),
              status: "active",
            })
            .eq("id", rawId);
        } catch (e: any) {
          await supabaseAdmin
            .from("on_market_raw_listings")
            .update({ last_fetch_error: e?.message ?? String(e) })
            .eq("id", rawId);

          result.errors.push({
            sourceId: source.id,
            sourceName: source.name,
            where: "parseDetail",
            message: e?.message ?? String(e),
          });
          continue;
        }

        // Normalize into canonical deal object
        const normalized = normalizeDeal({
          sourceName: source.name,
          sourceUrl: stub.listing_url,
          listing: stub,
          extracted,
        });

        // Upsert into on_market_deals with daily cap gating if this is a NEW normalized deal
        const wasNewDeal = await upsertDealWithDailyCap({
          supabaseAdmin,
          today,
          rawId,
          nowIso: now.toISOString(),
          normalized,
        });

        if (wasNewDeal === "promoted") result.promotedDeals += 1;
        if (wasNewDeal === "held") result.heldDeals += 1;
      }

      // mark source crawled
      await markSourceCrawl(supabaseAdmin, source.id, now.toISOString());
    } catch (e: any) {
      result.errors.push({
        sourceId: source.id,
        sourceName: source.name,
        where: "source loop",
        message: e?.message ?? String(e),
      });

      // Still mark crawl attempt to avoid hot looping
      await markSourceCrawl(supabaseAdmin, source.id, now.toISOString());
    }
  }

  return result;
}

/* =======================================================================================
   Cap gating + deal upsert
======================================================================================= */

async function upsertDealWithDailyCap(args: {
  supabaseAdmin: SupabaseAdmin;
  today: string; // YYYY-MM-DD
  rawId: string;
  nowIso: string;
  normalized: ReturnType<typeof normalizeDeal>;
}): Promise<"updated" | "promoted" | "held"> {
  const { supabaseAdmin, today, rawId, nowIso, normalized } = args;

  // Does a normalized deal already exist for this raw listing?
  const { data: existingDeal, error: dealSelErr } = await supabaseAdmin
    .from("on_market_deals")
    .select("id, is_promoted, promoted_date")
    .eq("primary_raw_listing_id", rawId)
    .maybeSingle();

  if (dealSelErr) {
    throw new Error(`Select on_market_deals failed: ${dealSelErr.message}`);
  }

  // If exists, update fields + last_seen + is_new_today flag
  if (existingDeal?.id) {
    await supabaseAdmin
      .from("on_market_deals")
      .update({
        company_name: normalized.company_name,
        headline: normalized.headline,
        industry_tag: normalized.industry_tag,
        industry_confidence: normalized.industry_confidence,
        location_city: normalized.location_city,
        location_state: normalized.location_state,
        revenue_min: normalized.revenue_min,
        revenue_max: normalized.revenue_max,
        ebitda_min: normalized.ebitda_min,
        ebitda_max: normalized.ebitda_max,
        revenue_band: normalized.revenue_band,
        ebitda_band: normalized.ebitda_band,
        asking_price: normalized.asking_price,
        deal_type: normalized.deal_type,
        has_teaser_pdf: normalized.has_teaser_pdf,
        source_name: normalized.source_name,
        source_url: normalized.source_url,
        data_confidence: normalized.data_confidence,
        confidence_score: normalized.confidence_score,
        last_seen_at: nowIso,
        published_at: normalized.published_at,
        is_new_today: existingDeal.promoted_date === today,
      })
      .eq("id", existingDeal.id);

    return "updated";
  }

  // New normalized deal → apply daily cap gating
  const capRow = await getDailyCapRow(supabaseAdmin, today);
  const cap = capRow?.cap ?? 10;
  const used = capRow?.used ?? 0;

  const canPromote = used < cap;

  if (canPromote) {
    // Insert promoted deal
    const { error: insErr } = await supabaseAdmin.from("on_market_deals").insert({
      primary_raw_listing_id: rawId,

      company_name: normalized.company_name,
      headline: normalized.headline,

      industry_tag: normalized.industry_tag,
      industry_confidence: normalized.industry_confidence,

      location_city: normalized.location_city,
      location_state: normalized.location_state,

      revenue_min: normalized.revenue_min,
      revenue_max: normalized.revenue_max,
      ebitda_min: normalized.ebitda_min,
      ebitda_max: normalized.ebitda_max,

      revenue_band: normalized.revenue_band,
      ebitda_band: normalized.ebitda_band,

      asking_price: normalized.asking_price,

      deal_type: normalized.deal_type,
      has_teaser_pdf: normalized.has_teaser_pdf,

      source_name: normalized.source_name,
      source_url: normalized.source_url,

      data_confidence: normalized.data_confidence,
      confidence_score: normalized.confidence_score,

      first_seen_at: nowIso,
      last_seen_at: nowIso,
      published_at: normalized.published_at,

      is_promoted: true,
      promoted_date: today,
      is_new_today: true,
    });

    if (insErr) throw new Error(`Insert on_market_deals failed: ${insErr.message}`);

    // Increment used
    await supabaseAdmin
      .from("daily_inventory_caps")
      .update({ used: used + 1 })
      .eq("date", today);

    return "promoted";
  }

  // Hold: insert as not promoted (still stored, but not searchable due to RLS policy)
  const { error: heldErr } = await supabaseAdmin.from("on_market_deals").insert({
    primary_raw_listing_id: rawId,

    company_name: normalized.company_name,
    headline: normalized.headline,

    industry_tag: normalized.industry_tag,
    industry_confidence: normalized.industry_confidence,

    location_city: normalized.location_city,
    location_state: normalized.location_state,

    revenue_min: normalized.revenue_min,
    revenue_max: normalized.revenue_max,
    ebitda_min: normalized.ebitda_min,
    ebitda_max: normalized.ebitda_max,

    revenue_band: normalized.revenue_band,
    ebitda_band: normalized.ebitda_band,

    asking_price: normalized.asking_price,

    deal_type: normalized.deal_type,
    has_teaser_pdf: normalized.has_teaser_pdf,

    source_name: normalized.source_name,
    source_url: normalized.source_url,

    data_confidence: normalized.data_confidence,
    confidence_score: normalized.confidence_score,

    first_seen_at: nowIso,
    last_seen_at: nowIso,
    published_at: normalized.published_at,

    is_promoted: false,
    promoted_date: null,
    is_new_today: false,
  });

  if (heldErr) throw new Error(`Insert held on_market_deals failed: ${heldErr.message}`);

  return "held";
}

/* =======================================================================================
   Daily cap helpers
======================================================================================= */

async function ensureDailyCapRow(supabaseAdmin: SupabaseAdmin, date: string, defaultCap: number) {
  const { data, error } = await supabaseAdmin
    .from("daily_inventory_caps")
    .select("date, cap, used")
    .eq("date", date)
    .maybeSingle();

  if (error) throw new Error(`daily_inventory_caps select failed: ${error.message}`);

  if (!data) {
    const { error: insErr } = await supabaseAdmin.from("daily_inventory_caps").insert({
      date,
      cap: defaultCap,
      used: 0,
    });
    if (insErr) throw new Error(`daily_inventory_caps insert failed: ${insErr.message}`);
  }
}

async function getDailyCapRow(supabaseAdmin: SupabaseAdmin, date: string) {
  const { data, error } = await supabaseAdmin
    .from("daily_inventory_caps")
    .select("date, cap, used")
    .eq("date", date)
    .maybeSingle();

  if (error) throw new Error(`daily_inventory_caps select failed: ${error.message}`);
  return data as null | { date: string; cap: number; used: number };
}

/* =======================================================================================
   Source due logic
======================================================================================= */

function isSourceDue(source: any, now: Date): boolean {
  const intervalMinutes = Number(source.crawl_interval_minutes ?? 1440);
  const last = source.last_crawled_at ? new Date(source.last_crawled_at) : null;

  if (!last) return true;
  const diffMs = now.getTime() - last.getTime();
  const diffMin = diffMs / (1000 * 60);
  return diffMin >= intervalMinutes;
}

async function markSourceCrawl(supabaseAdmin: SupabaseAdmin, sourceId: string, nowIso: string) {
  await supabaseAdmin
    .from("on_market_sources")
    .update({ last_crawled_at: nowIso })
    .eq("id", sourceId);
}

/* =======================================================================================
   Deal touch helper (when raw listing seen but unchanged)
======================================================================================= */

async function touchDealLastSeen(supabaseAdmin: SupabaseAdmin, rawId: string, nowIso: string) {
  await supabaseAdmin
    .from("on_market_deals")
    .update({ last_seen_at: nowIso })
    .eq("primary_raw_listing_id", rawId);
}

/* =======================================================================================
   Fetch helpers
======================================================================================= */

async function safeFetch(fetchFn: typeof fetch, url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutMs = 60_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchFn(url, {
      ...init,
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err: any) {
    const msg =
      err?.name === "AbortError"
        ? `AbortError: timed out after ${timeoutMs}ms`
        : err?.message ?? String(err);

    throw new Error(`safeFetch failed for ${url}: ${msg}`);
  } finally {
    clearTimeout(timeout);
  }
}

/* =======================================================================================
   Utility
======================================================================================= */

function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hashChecksum(obj: Record<string, unknown>): string {
  const s = JSON.stringify(obj);
  return crypto.createHash("sha256").update(s).digest("hex");
}
