import { NextResponse } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";

// Bearer helper (same as your deal-chat route)
function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim();
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized (missing token)" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const dealId = body?.dealId;
    if (!dealId) {
      return NextResponse.json({ error: "Missing dealId" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createSupabase(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: "Unauthorized (bad token)" }, { status: 401 });
    }
    const userId = authData.user.id;

    // workspace lookup (same as your other route)
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", userId)
      .single();

    if (profErr || !profile?.workspace_id) {
      return NextResponse.json({ error: "Profile/workspace not found" }, { status: 403 });
    }
    const workspaceId = profile.workspace_id;

    // delete only THIS user's chat for THIS deal
    const { error: delErr } = await supabase
      .from("deal_chat_messages")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("deal_id", dealId)
      .eq("user_id", userId);

    if (delErr) {
      console.error("deal-chat clear error:", delErr);
      return NextResponse.json({ error: "Unable to clear chat messages. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("deal-chat clear catch error:", error);
    return NextResponse.json(
      { error: "Unable to clear chat. Please try again." },
      { status: 500 }
    );
  }
}
