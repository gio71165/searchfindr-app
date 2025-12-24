// app/api/on-market/notes/route.ts
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

type CreateNoteBody = {
  workspace_saved_deal_id: string;
  note: string;
};

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

    const workspace_saved_deal_id = req.nextUrl.searchParams.get("workspace_saved_deal_id");
    if (!workspace_saved_deal_id) return json(400, { error: "Missing workspace_saved_deal_id" });

    // Enforce ownership: the saved deal must belong to the current user
    const { data: savedRow, error: savedErr } = await supabase
      .from("workspace_saved_deals")
      .select("id, user_id")
      .eq("id", workspace_saved_deal_id)
      .maybeSingle();

    if (savedErr) return json(400, { error: savedErr.message });
    if (!savedRow || savedRow.user_id !== user_id) return json(403, { error: "Forbidden" });

    const { data, error } = await supabase
      .from("deal_notes")
      .select("id, workspace_saved_deal_id, note, created_at")
      .eq("workspace_saved_deal_id", workspace_saved_deal_id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return json(400, { error: error.message });

    return json(200, {
      ok: true,
      workspace_saved_deal_id,
      count: data?.length ?? 0,
      notes: data ?? [],
    });
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) });
  }
}

export async function POST(req: NextRequest) {
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

    const body = (await req.json()) as CreateNoteBody;
    const workspace_saved_deal_id = body?.workspace_saved_deal_id;
    const note = (body?.note ?? "").trim();

    if (!workspace_saved_deal_id) return json(400, { error: "Missing workspace_saved_deal_id" });
    if (!note) return json(400, { error: "Note cannot be empty" });
    if (note.length > 5000) return json(400, { error: "Note too long (max 5000 chars)" });

    // Ownership check
    const { data: savedRow, error: savedErr } = await supabase
      .from("workspace_saved_deals")
      .select("id, user_id")
      .eq("id", workspace_saved_deal_id)
      .maybeSingle();

    if (savedErr) return json(400, { error: savedErr.message });
    if (!savedRow || savedRow.user_id !== user_id) return json(403, { error: "Forbidden" });

    const { data, error } = await supabase
      .from("deal_notes")
      .insert({
        workspace_saved_deal_id,
        note,
      })
      .select("id, workspace_saved_deal_id, note, created_at")
      .single();

    if (error) return json(400, { error: error.message });

    return json(200, { ok: true, note: data });
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) });
  }
}
