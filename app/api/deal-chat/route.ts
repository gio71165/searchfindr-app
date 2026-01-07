// app/api/deal-chat/route.ts
import { NextResponse } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { chatForDeal } from "@/lib/ai/dealChat";

type ChatRole = "user" | "assistant" | "system";

// Bearer helper
function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim();
}

function makeAuthedSupabase(token: string) {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

async function getWorkspaceIdForUser(supabase: any, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", userId)
    .single();

  if (error || !profile?.workspace_id) return { workspaceId: null as string | null, error };
  return { workspaceId: profile.workspace_id as string, error: null };
}

async function getDealForWorkspace(supabase: any, dealId: string, workspaceId: string) {
  const { data: deal, error } = await supabase
    .from("companies")
    .select(
      [
        "id",
        "workspace_id",
        "company_name",
        "listing_url",
        "external_id",
        "ai_summary",
        "ai_red_flags",
        "ai_financials_json",
        "ai_scoring_json",
        "criteria_match_json",
        "ai_confidence_json",
        "raw_listing_text",
        "cim_storage_path",
      ].join(",")
    )
    .eq("id", dealId)
    .eq("workspace_id", workspaceId)
    .single();

  return { deal, error };
}

export async function POST(req: Request) {
  try {
    // 1) Auth
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized (missing token)" }, { status: 401 });
    }

    const supabase = makeAuthedSupabase(token);

    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: "Unauthorized (bad token)" }, { status: 401 });
    }
    const userId = authData.user.id;

    // 2) Body
    const body = await req.json().catch(() => null);
    const dealId = body?.dealId;
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const historyRaw = Array.isArray(body?.history) ? body.history : [];

    if (!dealId || !message) {
      return NextResponse.json({ error: "Missing dealId or message" }, { status: 400 });
    }

    // 3) Workspace
    const { workspaceId, error: wsErr } = await getWorkspaceIdForUser(supabase, userId);
    if (wsErr || !workspaceId) {
      return NextResponse.json({ error: "Profile/workspace not found" }, { status: 403 });
    }

    // 4) Deal (workspace-scoped)
    const { deal, error: dealErr } = await getDealForWorkspace(supabase, dealId, workspaceId);
    if (dealErr || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // 5) Mode A enforcement (schema truth)
    const isCim = !!deal.cim_storage_path;
    const isOnMarket = !!deal.listing_url || !!deal.external_id;
    if (!isCim && !isOnMarket) {
      return NextResponse.json({ error: "Chat is not enabled for this deal type." }, { status: 400 });
    }
    const sourceType = isCim ? "cim_pdf" : "on_market";

    // 6) Rate limit (window)
    const WINDOW_SECONDS = 60;
    const MAX_USER_MESSAGES_PER_WINDOW = 5;
    const sinceIso = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

    const { count: recentCount, error: recentErr } = await supabase
      .from("deal_chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", sinceIso);

    if (recentErr) {
      return NextResponse.json({ error: "Rate limit check failed" }, { status: 500 });
    }

    if ((recentCount ?? 0) >= MAX_USER_MESSAGES_PER_WINDOW) {
      return NextResponse.json(
        { answer: "Rate limit: please wait a moment before sending more messages.", sources_used: ["rate_limit"] },
        { status: 200 }
      );
    }

    // 7) Hard cap per deal per user (turns)
    const MAX_MESSAGES_PER_DEAL = 30; // turns (user+assistant => *2 rows)
    const { count: totalCount, error: countErr } = await supabase
      .from("deal_chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("deal_id", dealId)
      .eq("user_id", userId);

    if (countErr) {
      return NextResponse.json({ error: "Rate limit check failed" }, { status: 500 });
    }

    if ((totalCount ?? 0) >= MAX_MESSAGES_PER_DEAL * 2) {
      return NextResponse.json(
        {
          answer:
            "You’ve reached the maximum number of messages for this deal. Clear the chat or move to another deal.",
          sources_used: ["system_limit"],
        },
        { status: 200 }
      );
    }

    // 8) Canonical deal context (server truth)
    const dealContext = {
      company_name: deal.company_name,
      source_type: sourceType,
      ai_summary: deal.ai_summary,
      ai_red_flags: deal.ai_red_flags,
      ai_financials_json: deal.ai_financials_json,
      ai_scoring_json: deal.ai_scoring_json,
      criteria_match_json: deal.criteria_match_json,
      ai_confidence_json: deal.ai_confidence_json,
      raw_listing_text: (deal.raw_listing_text ?? "").slice(0, 8000),
      cim_storage_path: deal.cim_storage_path,
      listing_url: deal.listing_url,
    };

    // 9) Clean history
    const history = historyRaw
      .slice(-10)
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant" || m.role === "system"))
      .map((m: any) => ({
        role: m.role as ChatRole,
        content: String(m.content ?? "").slice(0, 4000),
      }));

    // 10) AI call
    const ai = await chatForDeal({
      userMessage: message,
      dealContext,
      history,
    });

    const answer = ai?.answer ?? "";
    const sources_used = ai?.sources_used ?? ["companies.ai_*"];

    // 11) Persist (best effort)
    const insertRows = [
      {
        workspace_id: workspaceId,
        deal_id: dealId,
        user_id: userId,
        role: "user",
        content: message,
        meta: { sources_used },
      },
      {
        workspace_id: workspaceId,
        deal_id: dealId,
        user_id: userId,
        role: "assistant",
        content: answer,
        meta: {
          sources_used,
          model: ai?.model,
          tokens: ai?.tokens,
          latency_ms: ai?.latency_ms,
        },
      },
    ];

    const { error: insErr } = await supabase.from("deal_chat_messages").insert(insertRows);
    if (insErr) {
      return NextResponse.json({ answer, sources_used, warning: "Failed to persist chat" });
    }

    return NextResponse.json({ answer, sources_used });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId");
  if (!dealId) return NextResponse.json({ error: "Missing dealId" }, { status: 400 });

  const supabase = makeAuthedSupabase(token);

  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = authData.user.id;

  const { workspaceId, error: wsErr } = await getWorkspaceIdForUser(supabase, userId);
  if (wsErr || !workspaceId) {
    return NextResponse.json({ error: "Profile/workspace not found" }, { status: 403 });
  }

  const { data: rows, error } = await supabase
    .from("deal_chat_messages")
    .select("role, content, created_at")
    .eq("workspace_id", workspaceId)
    .eq("deal_id", dealId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  const messages = (rows ?? []).map((r: any) => ({
    role: r.role,
    content: r.content,
  }));

  return NextResponse.json({ messages });
}

export async function DELETE(req: Request) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId");
  if (!dealId) return NextResponse.json({ error: "Missing dealId" }, { status: 400 });

  const supabase = makeAuthedSupabase(token);

  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = authData.user.id;

  const { workspaceId, error: wsErr } = await getWorkspaceIdForUser(supabase, userId);
  if (wsErr || !workspaceId) {
    return NextResponse.json({ error: "Profile/workspace not found" }, { status: 403 });
  }

  const { error } = await supabase
    .from("deal_chat_messages")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("deal_id", dealId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: "Failed to clear messages" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
