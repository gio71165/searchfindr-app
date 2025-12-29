// lib/onmarket/ingest/worker.ts
import crypto from "crypto";
import { getParser } from "../parsers";
import type { ListingStub } from "../parsers/types";
import { normalizeDeal, type NormalizedDeal, type V1IndustryTag } from "../normalize";

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

/**
 * V1 hard lock
 */
const V1_ALLOWED_INDUSTRIES: readonly V1IndustryTag[] = ["HVAC", "Plumbing", "Electrical"] as const;

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

  // ✅ Use America/Chicago “today” for caps + promoted_date
  const today = isoDateInTimeZone(now, "America/Chicago"); // YYYY-MM-DD

  // Debug-friendly cap while testing
  await ensureDailyCapRow(supabaseAdmin, today, 1000);

  // Pull enabled sources
  const { data: sources, error: sourcesErr } = await supabaseAdmin
    .from("on_market_sources")
    .select("*")
    .eq("is_enabled", true)
    .limit(maxSourcesPerRun);

  if (sourcesErr) throw new Error(`Failed to load on_market_sources: ${sourcesErr.message}`);

  for (const source of sources ?? []) {
    const due = isSourceDue(source, now);
    if (!due) {
      result.sourcesSkipped += 1;
      continue;
    }

    result.sourcesProcessed += 1;

    const delayMs = perRequestDelayMs(Number(source.rate_limit_per_minute ?? 0));

    try {
      const parser = getParser(source.parser_key);

      // ----------------------------
      // 1) Fetch index
      // ----------------------------
      let entryRes: Response;
      try {
        entryRes = await safeFetch(fetchFn, source.entry_url, {
          headers: browserHeaders(),
          timeoutMs: timeoutForUrl(source.entry_url),
        });
        await sleep(delayMs);
      } catch (e: any) {
        await markSourceCrawl(supabaseAdmin, source.id, now.toISOString());
        result.errors.push({
          sourceId: source.id,
          sourceName: source.name,
          where: "fetch entry_url",
          message: e?.message ?? String(e),
        });
        continue;
      }

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

      // ----------------------------
      // 2) Parse index → stubs
      // ----------------------------
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

      // ----------------------------
      // 3) Process each stub
      // ----------------------------
      for (const stub of stubs) {
        if (!stub.listing_url) continue;

        const checksum = hashChecksum({
          title: stub.title ?? "",
          maybe_date: stub.maybe_date ?? "",
          maybe_location: stub.maybe_location ?? "",
          maybe_price: stub.maybe_price ?? "",
        });

        // Find existing raw row
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
        const upsertPayload = {
          source_id: source.id,
          listing_url: stub.listing_url,
          title_raw: stub.title,
          snippet_raw: null,
          payload_json: { stub },
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

        // Touch last_seen for existing deal rows (if any)
        if (!isNew && !isChanged) {
          await touchDealLastSeen(supabaseAdmin, rawId, now.toISOString());
        }

        // ----------------------------
        // 4) Fetch detail & parse
        // ----------------------------
        let extracted: any = null;
        try {
          const detailRes = await safeFetch(fetchFn, stub.listing_url, {
            headers: browserHeaders(),
            timeoutMs: timeoutForUrl(stub.listing_url),
          });
          await sleep(delayMs);

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

          await supabaseAdmin
            .from("on_market_raw_listings")
            .update({
              payload_json: { stub, extracted },
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

        // ----------------------------
        // 5) Normalize (V1 taxonomy enforced inside normalize.ts)
        // ----------------------------
        const normalized = normalizeDeal({
          sourceName: source.name,
          sourceUrl: stub.listing_url,
          listing: stub,
          extracted,
        });

        // ----------------------------
        // 6) Upsert into canonical (curation-aware)
        // ----------------------------
        const outcome = await upsertDealWithDailyCap({
          supabaseAdmin,
          today,
          rawId,
          nowIso: now.toISOString(),
          normalized,
        });

        if (outcome === "promoted") result.promotedDeals += 1;
        if (outcome === "held") result.heldDeals += 1;
      }

      await markSourceCrawl(supabaseAdmin, source.id, now.toISOString());
    } catch (e: any) {
      result.errors.push({
        sourceId: source.id,
        sourceName: source.name,
        where: "source loop",
        message: e?.message ?? String(e),
      });
      await markSourceCrawl(supabaseAdmin, source.id, now.toISOString());
    }
  }

  return result;
}

/* =======================================================================================
   Promotion gate (curation) — V1
======================================================================================= */

function passesPromotionGate(normalized: NormalizedDeal) {
  // must be one of allowed V1 tags
  if (!normalized.industry_tag) return false;
  if (!V1_ALLOWED_INDUSTRIES.includes(normalized.industry_tag)) return false;

  // strong enough classification
  if ((normalized.industry_confidence ?? 0) < 70) return false;

  // completeness: medium+ only
  if ((normalized.confidence_score ?? 0) < 45) return false;

  // anchors: avoid empty garbage
  const hasLocation = !!(normalized.location_city || normalized.location_state);
  const hasMoney = !!(
    normalized.revenue_min ||
    normalized.revenue_max ||
    normalized.ebitda_min ||
    normalized.ebitda_max ||
    normalized.asking_price
  );

  const textLen = String((normalized.debug as any)?.industry_blob_sample ?? "").length;
  const hasText = textLen >= 160;

  return hasLocation || hasMoney || hasText;
}

/* =======================================================================================
   Cap gating + deal upsert (IMPORTANT BEHAVIOR)
   - Never create canonical rows when industry_tag is NULL
   - Sticky industry_tag on update (do not downgrade)
   - V1: Never allow non-V1 tags to exist in canonical table
======================================================================================= */

async function upsertDealWithDailyCap(args: {
  supabaseAdmin: SupabaseAdmin;
  today: string; // YYYY-MM-DD (America/Chicago)
  rawId: string;
  nowIso: string;
  normalized: NormalizedDeal;
}): Promise<"updated" | "promoted" | "held"> {
  const { supabaseAdmin, today, rawId, nowIso, normalized } = args;

  const { data: existingDeal, error: dealSelErr } = await supabaseAdmin
    .from("on_market_deals")
    .select("id, is_promoted, promoted_date, industry_tag, industry_confidence")
    .eq("primary_raw_listing_id", rawId)
    .maybeSingle();

  if (dealSelErr) throw new Error(`Select on_market_deals failed: ${dealSelErr.message}`);

  // ----------------------------
  // UPDATE PATH
  // ----------------------------
  if (existingDeal?.id) {
    const existingIndustryTag = (existingDeal.industry_tag as V1IndustryTag | null) ?? null;

    // Sticky tag: if existing has a tag and new is null, keep existing
    const nextIndustryTag =
      existingIndustryTag && !normalized.industry_tag ? existingIndustryTag : normalized.industry_tag;

    // V1 safety: if somehow nextIndustryTag is not allowed, force null (never leak into canonical)
    const safeNextIndustryTag =
      nextIndustryTag && V1_ALLOWED_INDUSTRIES.includes(nextIndustryTag) ? nextIndustryTag : null;

    const nextIndustryConfidence =
      safeNextIndustryTag && existingIndustryTag && !normalized.industry_tag
        ? Number(existingDeal.industry_confidence ?? 0)
        : Number(normalized.industry_confidence ?? 0);

    const gatePass = safeNextIndustryTag
      ? passesPromotionGate({
          ...normalized,
          industry_tag: safeNextIndustryTag,
          industry_confidence: nextIndustryConfidence,
        })
      : false;

    // Never un-promote. Only allow held → promoted.
    let nextIsPromoted = Boolean(existingDeal.is_promoted);
    let nextPromotedDate: string | null = existingDeal.promoted_date ?? null;

    if (!existingDeal.is_promoted && gatePass) {
      nextIsPromoted = true;
      nextPromotedDate = today;
    }

    await supabaseAdmin
      .from("on_market_deals")
      .update({
        company_name: normalized.company_name,
        headline: normalized.headline,

        industry_tag: safeNextIndustryTag,
        industry_confidence: safeNextIndustryTag ? nextIndustryConfidence : 0,

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

        is_promoted: nextIsPromoted,
        promoted_date: nextPromotedDate,
        is_new_today: nextPromotedDate === today,
      })
      .eq("id", existingDeal.id);

    return "updated";
  }

  // ----------------------------
  // INSERT PATH
  // ----------------------------

  // CRITICAL: If industry_tag is NULL, DO NOT create canonical
  if (!normalized.industry_tag) return "held";

  // V1 safety: only allow V1 tags into canonical
  if (!V1_ALLOWED_INDUSTRIES.includes(normalized.industry_tag)) return "held";

  const gatePass = passesPromotionGate(normalized);
  if (!gatePass) return "held";

  // Only consume cap if we are promoting
  const capRow = await getDailyCapRow(supabaseAdmin, today);
  const cap = capRow?.cap ?? 10;
  const used = capRow?.used ?? 0;

  if (used >= cap) return "held";

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

    // promoted = admitted to library
    is_promoted: true,
    promoted_date: today,
    is_new_today: true,
  });

  if (insErr) throw new Error(`Insert on_market_deals failed: ${insErr.message}`);

  await supabaseAdmin.from("daily_inventory_caps").update({ used: used + 1 }).eq("date", today);

  return "promoted";
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
  await supabaseAdmin.from("on_market_sources").update({ last_crawled_at: nowIso }).eq("id", sourceId);
}

/* =======================================================================================
   Deal touch helper
======================================================================================= */

async function touchDealLastSeen(supabaseAdmin: SupabaseAdmin, rawId: string, nowIso: string) {
  await supabaseAdmin.from("on_market_deals").update({ last_seen_at: nowIso }).eq("primary_raw_listing_id", rawId);
}

/* =======================================================================================
   Fetch helpers
======================================================================================= */

function browserHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  } as const;
}

function timeoutForUrl(url: string) {
  const h = hostOf(url);
  if (h.includes("bizquest")) return 7000;
  return 12_000;
}

async function safeFetch(fetchFn: typeof fetch, url: string, init?: RequestInit & { timeoutMs?: number }) {
  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? 12_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { timeoutMs: _ignore, ...rest } = init ?? {};
    return await fetchFn(url, {
      ...rest,
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err: any) {
    const msg = err?.name === "AbortError" ? `AbortError: timed out after ${timeoutMs}ms` : err?.message ?? String(err);
    throw new Error(`safeFetch failed for ${url}: ${msg}`);
  } finally {
    clearTimeout(timeout);
  }
}

/* =======================================================================================
   Throttle helpers
======================================================================================= */

function perRequestDelayMs(rateLimitPerMinute: number) {
  if (!Number.isFinite(rateLimitPerMinute) || rateLimitPerMinute <= 0) return 0;
  return Math.ceil(60_000 / rateLimitPerMinute);
}

function sleep(ms: number) {
  if (!ms || ms <= 0) return Promise.resolve();
  return new Promise((res) => setTimeout(res, ms));
}

function hostOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/* =======================================================================================
   Utility
======================================================================================= */

function isoDateInTimeZone(d: Date, timeZone: string): string {
  // en-CA yields YYYY-MM-DD format reliably
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function hashChecksum(obj: Record<string, unknown>): string {
  const s = JSON.stringify(obj);
  return crypto.createHash("sha256").update(s).digest("hex");
}

// after processing all listings for a source
await supabaseAdmin
  .from("on_market_raw_listings")
  .delete()
  .eq("source_id", sourceId)
  .not("id", "in", promotedRawIds);
