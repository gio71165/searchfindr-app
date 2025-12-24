// app/api/cron/on-market-ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runOnMarketIngestion } from "@/lib/onmarket/ingest/worker";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Set this in env (Vercel project env vars)
// Example: ON_MARKET_CRON_SECRET="some-long-random-string"
const CRON_SECRET = process.env.ON_MARKET_CRON_SECRET as string;

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, {
        error: "Missing Supabase env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      });
    }
    if (!CRON_SECRET) {
      return json(500, {
        error: "Missing ON_MARKET_CRON_SECRET env var.",
      });
    }

    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== CRON_SECRET) {
      return json(401, { error: "Unauthorized." });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const ingestResult = await runOnMarketIngestion({
      supabaseAdmin,
      maxSourcesPerRun: 20,
      maxListingsPerSource: 50,
    });

    return json(200, {
      ok: true,
      ran_at: new Date().toISOString(),
      ...ingestResult,
    });
  } catch (e: any) {
    return json(500, {
      ok: false,
      error: e?.message ?? String(e),
    });
  }
}
