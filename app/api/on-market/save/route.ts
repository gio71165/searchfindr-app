// app/api/on-market/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest, AuthError } from "@/lib/api/auth";

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


export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(500, { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" });
    }

    const body = (await req.json()) as SaveBody;
    const on_market_deal_id = body?.on_market_deal_id;
    const status = body?.status ?? "saved";

    if (!on_market_deal_id) {
      return json(400, { error: "Missing on_market_deal_id" });
    }
    if (!["saved", "pipeline", "passed"].includes(status)) {
      return json(400, { error: "Invalid status" });
    }

    const { supabase, user, workspace } = await authenticateRequest(req);

    // Validate workspace_id if provided (must match authenticated workspace)
    if (body.workspace_id && body.workspace_id !== workspace.id) {
      return json(403, { error: "Forbidden: workspace mismatch" });
    }

    // Upsert workspace_saved_deals (unique on workspace_id,user_id,on_market_deal_id)
    // Use authenticated workspace.id, not user-provided workspace_id
    const { data, error } = await supabase
      .from("workspace_saved_deals")
      .upsert(
        {
          workspace_id: workspace.id,
          user_id: user.id,
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
    if (e instanceof AuthError) {
      return json(e.statusCode, { error: e.message });
    }
    return json(500, { error: e?.message ?? String(e) });
  }
}
