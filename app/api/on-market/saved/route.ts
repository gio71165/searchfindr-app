// app/api/on-market/saved/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(500, { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" });
    }

    const token = getBearerToken(req);
    if (!token) return json(401, { error: "Missing Authorization Bearer token" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) return json(401, { error: "Unauthorized" });
    const user_id = authData.user.id;

    const workspace_id = req.nextUrl.searchParams.get("workspace_id");
    if (!workspace_id) return json(400, { error: "Missing workspace_id" });

    const status = req.nextUrl.searchParams.get("status"); // optional: saved|pipeline|passed
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 50), 1), 100);

    let q = supabase
      .from("workspace_saved_deals")
      .select(
        `
          id,
          workspace_id,
          user_id,
          status,
          created_at,
          updated_at,
          on_market_deal: on_market_deals (
            id,
            company_name,
            headline,
            industry_tag,
            industry_confidence,
            location_city,
            location_state,
            revenue_min,
            revenue_max,
            ebitda_min,
            ebitda_max,
            revenue_band,
            ebitda_band,
            asking_price,
            deal_type,
            has_teaser_pdf,
            source_name,
            source_url,
            data_confidence,
            confidence_score,
            first_seen_at,
            last_seen_at,
            published_at,
            is_new_today,
            promoted_date
          )
        `
      )
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && ["saved", "pipeline", "passed"].includes(status)) {
      q = q.eq("status", status);
    }

    const { data, error } = await q;
    if (error) return json(400, { error: error.message });

    return json(200, {
      ok: true,
      workspace_id,
      count: data?.length ?? 0,
      saved: data ?? [],
    });
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) });
  }
}
