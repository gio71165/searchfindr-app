// app/api/off-market/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Server-side Supabase client (service role) so inserts work reliably under RLS design
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com";

type Body = {
  industries: string[];
  location: string; // "City, ST"
  radius_miles: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const ALLOWED_RADIUS_MILES = [5, 10, 15, 25, 50, 75, 100];

// You asked: “max 25 companies”
const TARGET_MAX_RESULTS = 15;

// Cost / noise controls (tuned for “never 1–9 results” but still decent quality)
const KEYWORD_CAP = 8; // how many industry keywords total (after synonyms)
const DETAIL_CAP = 80; // how many places to fetch details for
const SURVIVOR_CAP = 60; // how many website-having candidates to consider
const AI_REVIEW_CAP = 30; // max AI evaluations per request (upper bound)
const MIN_RATINGS_TOTAL = 3; // light prefilter; do not make this high
const MIN_RATING = 3.6; // light prefilter; do not make this high

function isCityState(s: string) {
  return /^[^,]+,\s*[A-Za-z]{2}$/.test(s.trim());
}

function milesToMeters(mi: number) {
  return Math.round(mi * 1609.344);
}

function toTextSafe(s: any) {
  return typeof s === "string" ? s : "";
}

// Expand industry to multiple keywords so Places returns more
const INDUSTRY_SYNONYMS: Record<string, string[]> = {
  hvac: ["hvac", "heating", "air conditioning", "mechanical contractor"],
  electrical: ["electrical", "electrician", "electrical contractor"],
  plumbing: ["plumbing", "plumber", "plumbing contractor"],
  roofing: ["roofing", "roofer", "roof repair"],
  landscaping: ["landscaping", "lawn care", "landscape services"],
  cleaning: ["cleaning", "janitorial", "commercial cleaning", "cleaning service"],
  "commercial cleaning": ["commercial cleaning", "janitorial", "cleaning service"],
  janitorial: ["janitorial", "commercial cleaning", "cleaning service"],
  "pest control": ["pest control", "exterminator", "termite"],
  "auto repair": ["auto repair", "auto service", "mechanic"],
  "home health": ["home health", "home care", "caregiver services"],
};

function expandIndustryQueries(industry: string) {
  const key = industry.trim().toLowerCase();
  return INDUSTRY_SYNONYMS[key] ?? [industry];
}

// Hard filters (keep these light — your AI will do the real screening)
function failsHardFilter(input: { name: string | null; website: string | null; address: string | null }) {
  // You said: “still giving good companies, with websites”
  if (!input.website) return { fail: true, reason: "No website" };

  const name = (input.name ?? "").toLowerCase();

  const excludeKeywords = [
    "franchise",
    "franchising",
    "private equity",
    "venture",
    "vc",
    "fund",
    "investments",
    "holdings",
    "headquarters",
    "hq",
  ];

  for (const kw of excludeKeywords) {
    if (name.includes(kw)) return { fail: true, reason: `Keyword: ${kw}` };
  }

  return { fail: false, reason: "" };
}

async function getAuthedUserAndWorkspace(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return { userId: null, workspaceId: null };

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user?.id) return { userId: null, workspaceId: null };

  const userId = userData.user.id;

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", userId)
    .single();

  if (profErr || !profile?.workspace_id) return { userId, workspaceId: null };

  return { userId, workspaceId: profile.workspace_id as string };
}

async function googleGeocode(location: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", location);
  url.searchParams.set("key", GOOGLE_KEY!);

  const res = await fetch(url.toString());
  const json = await res.json();

  if (!res.ok || json.status !== "OK" || !json.results?.[0]?.geometry?.location) {
    throw new Error(`Geocode failed: ${json.status || res.status}`);
  }

  return json.results[0].geometry.location as { lat: number; lng: number };
}

/**
 * IMPORTANT: pagination support.
 * Nearby Search returns multiple pages using next_page_token (needs a delay).
 */
async function googlePlacesNearbyAllPages(params: { lat: number; lng: number; radiusMeters: number; keyword: string }) {
  const all: any[] = [];
  let pageToken: string | null = null;

  for (let page = 0; page < 3; page++) {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${params.lat},${params.lng}`);
    url.searchParams.set("radius", String(params.radiusMeters));
    url.searchParams.set("keyword", params.keyword);
    if (pageToken) url.searchParams.set("pagetoken", pageToken);
    url.searchParams.set("key", GOOGLE_KEY!);

    // next_page_token requires a short delay to become active
    if (pageToken) await new Promise((r) => setTimeout(r, 2000));

    const res = await fetch(url.toString());
    const json = await res.json();

    if (!res.ok || (json.status !== "OK" && json.status !== "ZERO_RESULTS")) {
      throw new Error(`Places nearby failed: ${json.status || res.status}`);
    }

    all.push(...(json.results ?? []));
    pageToken = json.next_page_token ?? null;
    if (!pageToken) break;
  }

  return all;
}

async function googlePlaceDetails(placeId: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    [
      "place_id",
      "name",
      "formatted_address",
      "formatted_phone_number",
      "website",
      "geometry/location",
      "rating",
      "user_ratings_total",
    ].join(",")
  );
  url.searchParams.set("key", GOOGLE_KEY!);

  const res = await fetch(url.toString());
  const json = await res.json();

  if (!res.ok || json.status !== "OK") return null;
  return json.result as any;
}

// V1: fetch ONLY homepage text (no crawling)
async function fetchHomepageText(urlStr: string) {
  try {
    const res = await fetch(urlStr, {
      redirect: "follow",
      headers: { "User-Agent": "SearchFindrBot/1.0 (+https://searchfindr.local)" },
    });

    if (!res.ok) return "";

    const html = await res.text();
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned.slice(0, 6000);
  } catch {
    return "";
  }
}

async function openAIKeepOrReject(input: {
  industries: string[];
  location: string;
  radiusMiles: number;
  companyName: string;
  website: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  ratingsTotal: number | null;
  homepageText: string;
}) {
  const prompt = `
You are SearchFindr, helping a search fund / ETA buyer find owner-operated small businesses.

Decide whether to KEEP this company as an off-market candidate.

Rules:
- Prefer real, local, owner-operated SMBs (not chains, not PE/holding branded).
- If unsure, set keep=false.
- Tier A is reserved for the best-looking businesses based on WEBSITE signals.
- If the website is thin or generic, do not give Tier A.

Search context:
- Industries: ${input.industries.join(", ")}
- Location: ${input.location} within ${input.radiusMiles} miles

Company:
- Name: ${input.companyName}
- Website: ${input.website}
- Address: ${input.address ?? ""}
- Phone: ${input.phone ?? ""}
- Google rating: ${input.rating ?? ""}
- Ratings count: ${input.ratingsTotal ?? ""}

Homepage text (may be partial):
${input.homepageText}

Return ONLY valid JSON:
{
  "keep": boolean,
  "tier": "A" | "B" | "C",
  "reasons": string[],
  "red_flags": string[]
}
`.trim();

  const res = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    const msg = json?.error?.message || "OpenAI error";
    throw new Error(msg);
  }

  const contentRaw = json?.choices?.[0]?.message?.content ?? "";
  const content = contentRaw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(content);

  if (typeof parsed?.keep !== "boolean") throw new Error("Bad AI response: keep missing");
  if (!["A", "B", "C"].includes(parsed?.tier)) throw new Error("Bad AI response: tier invalid");
  if (!Array.isArray(parsed?.reasons)) parsed.reasons = [];
  if (!Array.isArray(parsed?.red_flags)) parsed.red_flags = [];

  return parsed as { keep: boolean; tier: "A" | "B" | "C"; reasons: string[]; red_flags: string[] };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    if (!GOOGLE_KEY) {
      return NextResponse.json(
        { success: false, error: "Missing GOOGLE_MAPS_API_KEY" },
        { status: 500, headers: corsHeaders }
      );
    }
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Missing OPENAI_API_KEY" },
        { status: 500, headers: corsHeaders }
      );
    }

    const { userId, workspaceId } = await getAuthedUserAndWorkspace(req);
    if (!userId || !workspaceId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = (await req.json()) as Body;

    const industries = Array.isArray(body.industries)
      ? body.industries.map(toTextSafe).map((s) => s.trim()).filter(Boolean)
      : [];

    const location = toTextSafe(body.location).trim();
    const radiusMiles = Number(body.radius_miles);

    if (industries.length === 0) {
      return NextResponse.json({ success: false, error: "Select at least one industry" }, { status: 400, headers: corsHeaders });
    }
    if (!location || !isCityState(location)) {
      return NextResponse.json(
        { success: false, error: "Location must be 'City, ST' (e.g. 'Austin, TX')" },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!Number.isFinite(radiusMiles) || !ALLOWED_RADIUS_MILES.includes(radiusMiles)) {
      return NextResponse.json({ success: false, error: "Invalid radius" }, { status: 400, headers: corsHeaders });
    }

    // 1) Geocode
    const { lat, lng } = await googleGeocode(location);
    const radiusMeters = milesToMeters(radiusMiles);

    // 2) Build keywords (synonyms) but cap them
    const keywords = industries.flatMap(expandIndustryQueries).slice(0, KEYWORD_CAP);

    // 3) For each keyword, run a couple “less brittle” variants to avoid starving results.
    //    (This replaces the old “always append contractor/service” behavior.)
    const keywordVariants: string[] = [];
    for (const kw of keywords) {
      const base = kw.trim();
      if (!base) continue;

      keywordVariants.push(base);

      // Add one modifier variant but don’t overdo it
      if (!/service|contractor|company|services/i.test(base)) {
        if (/cleaning|janitorial/i.test(base)) keywordVariants.push(`${base} service`);
        else keywordVariants.push(`${base} contractor`);
      }
    }

    const uniqueVariants = Array.from(new Set(keywordVariants)).slice(0, Math.max(KEYWORD_CAP, 12));

    // 4) Google Places nearby (with pagination)
    const resultsByKeyword = await Promise.all(
      uniqueVariants.map((kw) => googlePlacesNearbyAllPages({ lat, lng, radiusMeters, keyword: kw }))
    );

    const mergedResults = resultsByKeyword.flat();

    // 5) Dedupe by place_id
    const seenPlaceIds = new Set<string>();
    const deduped = mergedResults.filter((r) => {
      const pid = r.place_id as string | undefined;
      if (!pid) return false;
      if (seenPlaceIds.has(pid)) return false;
      seenPlaceIds.add(pid);
      return true;
    });

    // 6) Fetch details (bigger cap)
    const detailed = await Promise.all(
      deduped.slice(0, DETAIL_CAP).map(async (r) => {
        const placeId = r.place_id as string | undefined;
        const details = placeId ? await googlePlaceDetails(placeId) : null;

        const name = details?.name ?? r.name ?? null;
        const address = details?.formatted_address ?? r.vicinity ?? null;
        const phone = details?.formatted_phone_number ?? null;
        const website = details?.website ?? null;

        const loc = details?.geometry?.location ?? r.geometry?.location ?? null;

        const rating = details?.rating ?? r.rating ?? null;
        const ratingsTotal = details?.user_ratings_total ?? r.user_ratings_total ?? null;

        const externalId = placeId ?? `${name ?? "unknown"}|${address ?? "unknown"}`;

        return {
          placeId: placeId ?? null,
          externalId,
          name,
          address,
          phone,
          website,
          lat: loc?.lat ?? null,
          lng: loc?.lng ?? null,
          rating,
          ratingsTotal,
        };
      })
    );

    // 7) Hard filter: website required + obvious excludes
    const survivors = detailed
      .filter((c) => {
        const hard = failsHardFilter({ name: c.name, website: c.website, address: c.address });
        return !hard.fail;
      })
      .slice(0, SURVIVOR_CAP);

    // 8) Light “quality-ish” prefilter before AI (not strict)
    //    Keep if it has SOME signal (rating/ratings) or we keep anyway if missing those.
    const prefiltered = survivors.filter((c) => {
      const rt = typeof c.ratingsTotal === "number" ? c.ratingsTotal : null;
      const r = typeof c.rating === "number" ? c.rating : null;

      // If missing both, still allow (don’t starve results)
      if (rt === null && r === null) return true;

      // Light bar only (don’t kill Tom’s River searches)
      if (rt !== null && rt >= MIN_RATINGS_TOTAL) return true;
      if (r !== null && r >= MIN_RATING) return true;

      // otherwise drop
      return false;
    });

    // 9) AI review sequentially so we can STOP once we have 25 keepers (huge improvement)
    const inserts: any[] = [];
    let aiReviewed = 0;

    for (const c of prefiltered) {
      if (inserts.length >= TARGET_MAX_RESULTS) break;
      if (aiReviewed >= AI_REVIEW_CAP) break;

      // Website is required by design
      if (!c.website) continue;

      const homepageText = await fetchHomepageText(c.website);

      const ai = await openAIKeepOrReject({
        industries,
        location,
        radiusMiles,
        companyName: c.name ?? "Unknown",
        website: c.website,
        address: c.address,
        phone: c.phone,
        rating: c.rating,
        ratingsTotal: c.ratingsTotal,
        homepageText: homepageText || "(no homepage text available)",
      });

      aiReviewed++;

      if (!ai.keep) continue;

      inserts.push({
        workspace_id: workspaceId,
        source_type: "off_market",
        external_source: "google_places",
        external_id: c.externalId,
        place_id: c.placeId,

        company_name: c.name,
        address: c.address,
        phone: c.phone,
        website: c.website,
        lat: c.lat,
        lng: c.lng,
        rating: c.rating,
        ratings_total: c.ratingsTotal,

        tier: ai.tier,
        tier_reason: {
          reasons: ai.reasons,
          red_flags: ai.red_flags,
          inputs: { industries, location, radius_miles: radiusMiles },
        },

        // IMPORTANT: never auto-save
        is_saved: false,
      });
    }

    if (inserts.length === 0) {
      return NextResponse.json(
        {
          success: true,
          count: 0,
          companies: [],
          note: "No companies passed filters (website + light prefilter + AI).",
          debug: {
            keywords_used: uniqueVariants,
            merged_results: mergedResults.length,
            deduped_results: deduped.length,
            detailed: detailed.length,
            survivors: survivors.length,
            prefiltered: prefiltered.length,
            ai_reviewed: aiReviewed,
            kept: inserts.length,
          },
        },
        { headers: corsHeaders }
      );
    }

    // 10) Upsert into companies (dedupe per workspace + external ids)
    const { data: saved, error: upsertErr } = await supabase
      .from("companies")
      .upsert(inserts, { onConflict: "workspace_id,external_source,external_id" })
      .select("id, company_name, address, phone, website, tier, is_saved, created_at, place_id");

    if (upsertErr) {
      return NextResponse.json({ success: false, error: upsertErr.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        success: true,
        count: saved?.length ?? 0,
        companies: saved ?? [],
        debug: {
          keywords_used: uniqueVariants,
          merged_results: mergedResults.length,
          deduped_results: deduped.length,
          detailed: detailed.length,
          survivors: survivors.length,
          prefiltered: prefiltered.length,
          ai_reviewed: aiReviewed,
          kept: inserts.length,
        },
      },
      { headers: corsHeaders }
    );
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
