// app/api/off-market/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Server-side Supabase client (service role) so inserts work reliably under RLS design
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com";

type Body = {
  industries: string[]; // ✅ multi-select
  location: string; // e.g. "Austin, TX"
  radius_miles: number; // e.g. 10
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const ALLOWED_RADIUS_MILES = [5, 10, 15, 25, 50, 75, 100];

function isCityState(s: string) {
  // Accept "City, ST" (ST = 2 letters)
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
  cleaning: ["cleaning", "janitorial", "commercial cleaning"],
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

// Very V1: hard filters that eliminate obvious noise BEFORE AI
function failsHardFilter(input: { name: string | null; website: string | null; address: string | null }) {
  // Require a website (key V1 rule to avoid directory noise)
  if (!input.website) return { fail: true, reason: "No website" };

  const name = (input.name ?? "").toLowerCase();

  // Obvious “not a small owner-operator target” signals
  const excludeKeywords = [
    "franchise",
    "franchising",
    "corporate",
    "headquarters",
    "hq",
    "holdings",
    "private equity",
    "venture",
    "vc",
    "fund",
    "investments",
    "group",
    "llc", // optional: can be too aggressive; disabled below
  ];

  for (const kw of excludeKeywords) {
    if (kw === "llc") continue; // disabled by default (too aggressive)
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

async function googlePlacesNearby(params: { lat: number; lng: number; radiusMeters: number; keyword: string }) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${params.lat},${params.lng}`);
  url.searchParams.set("radius", String(params.radiusMeters));

  // ✅ Key improvement: make keyword less brittle for contractor/service SMBs
  const kw = params.keyword.trim();
  const kwPlus = /cleaning|janitorial/i.test(kw) ? `${kw} service` : `${kw} contractor`;
  url.searchParams.set("keyword", kwPlus);

  url.searchParams.set("key", GOOGLE_KEY!);

  const res = await fetch(url.toString());
  const json = await res.json();

  if (!res.ok || (json.status !== "OK" && json.status !== "ZERO_RESULTS")) {
    throw new Error(`Places nearby failed: ${json.status || res.status}`);
  }

  return (json.results ?? []) as any[];
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

Search criteria:
- Industries: ${input.industries.join(", ")}
- Geography: ${input.location} within ${input.radiusMiles} miles
- Must be plausibly owner-operated SMB (not a chain, not franchise-heavy, not PE/VC/holding-company branded)
- Prefer local service businesses with real operations
- If unsure, reject (KEEP=false) to reduce noise in V1

Company:
- Name: ${input.companyName}
- Website: ${input.website}
- Address: ${input.address ?? ""}
- Phone: ${input.phone ?? ""}
- Google rating: ${input.rating ?? ""}
- Ratings count: ${input.ratingsTotal ?? ""}

Homepage text (may be partial):
${input.homepageText}

Return ONLY valid JSON in this exact schema:
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
      return NextResponse.json(
        { success: false, error: "Select at least one industry" },
        { status: 400, headers: corsHeaders }
      );
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

    // 1) Geocode the location
    const { lat, lng } = await googleGeocode(location);

    // 2) Places search for each industry (plus synonyms), merge + dedupe
    const radiusMeters = milesToMeters(radiusMiles);

    const keywords = industries.flatMap(expandIndustryQueries);

    // Guardrail: don't explode requests if user selects many industries / synonyms
    const KEYWORD_CAP = 8;
    const keywordSlice = keywords.slice(0, KEYWORD_CAP);

    const resultsByKeyword = await Promise.all(
      keywordSlice.map((kw) => googlePlacesNearby({ lat, lng, radiusMeters, keyword: kw }))
    );

    const mergedResults = resultsByKeyword.flat();

    const seenPlaceIds = new Set<string>();
    const results = mergedResults.filter((r) => {
      const pid = r.place_id as string | undefined;
      if (!pid) return false;
      if (seenPlaceIds.has(pid)) return false;
      seenPlaceIds.add(pid);
      return true;
    });

    // 3) Fetch details (cap raw candidates)
    const DETAIL_CAP = 35;
    const detailed = await Promise.all(
      results.slice(0, DETAIL_CAP).map(async (r) => {
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

    // 4) Hard filter (free)
    const survivors = detailed.filter((c) => {
      const hard = failsHardFilter({ name: c.name, website: c.website, address: c.address });
      return !hard.fail;
    });

    // 5) AI review ONLY on survivors (cap for cost control)
    const AI_CAP = 12;
    const toReview = survivors.slice(0, AI_CAP);

    const reviewed = await Promise.all(
      toReview.map(async (c) => {
        const homepageText = c.website ? await fetchHomepageText(c.website) : "";

        // More lenient: still run AI even if homepage text is empty
        const ai = await openAIKeepOrReject({
          industries,
          location,
          radiusMiles,
          companyName: c.name ?? "Unknown",
          website: c.website!,
          address: c.address,
          phone: c.phone,
          rating: c.rating,
          ratingsTotal: c.ratingsTotal,
          homepageText: homepageText || "(no homepage text available)",
        });

        return { keep: ai.keep, company: c, ai };
      })
    );

    // 6) Build inserts ONLY for KEEP=true
    const inserts = reviewed
      .filter((r) => r.keep === true && r.ai)
      .map((r) => {
        const c = r.company;
        const ai = r.ai;

        return {
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

          // IMPORTANT: never auto-save (user must click Save)
          is_saved: false,
        };
      });

    if (inserts.length === 0) {
      return NextResponse.json(
        { success: true, count: 0, companies: [], note: "No companies passed filters (hard + AI)." },
        { headers: corsHeaders }
      );
    }

    // 7) Upsert into companies (dedupe per workspace + external ids)
    const { data: saved, error: upsertErr } = await supabase
      .from("companies")
      .upsert(inserts, { onConflict: "workspace_id,external_source,external_id" })
      .select("id, company_name, address, phone, website, tier, is_saved, created_at, place_id");

    if (upsertErr) {
      return NextResponse.json({ success: false, error: upsertErr.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, count: saved?.length ?? 0, companies: saved ?? [] }, { headers: corsHeaders });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
