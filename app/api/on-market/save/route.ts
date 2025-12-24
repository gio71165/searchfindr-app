// app/api/on-market/save/route.ts
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

type SaveBody = {
  workspace_id: string;
  on_market_deal_id: string;
  status?: "saved" | "pipeline" | "passed";
};

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(500, { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" });
    }

    const body = (await req.json()) as SaveBody;
    const workspace_id = body?.workspace_id;
    const on_market_deal_id = body?.on_market_deal_id;
    const status = body?.status ?? "saved";

    if (!workspace_id || !on_market_deal_id) {
      return json(400, { error: "Missing workspace_id or on_market_deal_id" });
    }
    if (!["saved", "pipeline", "passed"].includes(status)) {
      return json(400, { error: "Invalid status" });
    }

    // Create a Supabase client that can read the user from the JWT (Authorization header).
    // On the client, you’ll call this with:
    // fetch('/api/on-market/save', { method:'POST', headers:{ Authorization:`Bearer ${session.access_token}` }, body: JSON.stringify(...) })
    const token = getBearerToken(req);
    if (!token) return json(401, { error: "Missing Authorization Bearer token" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) {
      return json(401, { error: "Unauthorized" });
    }

    const user_id = authData.user.id;

    // Upsert workspace_saved_deals (unique on workspace_id,user_id,on_market_deal_id)
    const { data, error } = await supabase
      .from("workspace_saved_deals")
      .upsert(
        {
          workspace_id,
          user_id,
          on_market_deal_id,
          status,
        },
        { onConflict: "workspace_id,user_id,on_market_deal_id" }
      )
      .select("id, workspace_id, user_id, on_market_deal_id, status, created_at, updated_at")
      .single();

    if (error) return json(400, { error: error.message });

    return json(200, { ok: true, saved: data });
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) });
  }
}
