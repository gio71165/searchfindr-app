// app/api/deal-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { chatForDeal } from "@/lib/ai/dealChat";
import { DealsRepository } from "@/lib/data-access/deals";
import { ChatRepository } from "@/lib/data-access/chat";
import { NotFoundError, DatabaseError } from "@/lib/data-access/base";
import { sanitizeForPrompt, sanitizeShortText } from "@/lib/utils/sanitize";
import { validateInputLength } from "@/lib/api/security";
import type { ChatRole } from "@/lib/types/deal";

const MAX_MESSAGE_LENGTH = 5000;

export async function POST(req: NextRequest) {
  let body: any = null;
  let user: any = null;
  
  try {
    // 1) Auth
    const { supabase, user: authUser, workspace } = await authenticateRequest(req);
    user = authUser;
    const deals = new DealsRepository(supabase, workspace.id);
    const chat = new ChatRepository(supabase, workspace.id);

    // 2) Body
    body = await req.json().catch(() => null);
    const dealId = body?.dealId;
    const messageRaw = typeof body?.message === "string" ? body.message.trim() : "";
    const historyRaw = Array.isArray(body?.history) ? body.history : [];

    if (!dealId || !messageRaw) {
      return NextResponse.json({ error: "Missing dealId or message" }, { status: 400 });
    }

    // Input length validation
    const messageLengthError = validateInputLength(messageRaw, MAX_MESSAGE_LENGTH, 'Message');
    if (messageLengthError) {
      return NextResponse.json({ error: messageLengthError }, { status: 400 });
    }

    const message = sanitizeForPrompt(messageRaw);

    // 3) Deal (workspace-scoped) - try including archived deals if not found
    let deal;
    try {
      deal = await deals.getById(dealId);
    } catch (err) {
      // If deal not found (might be archived), try including archived
      if (err instanceof NotFoundError) {
        deal = await deals.getByIdIncludingArchived(dealId);
      } else {
        throw err;
      }
    }

    // 5) Determine deal type and source type
    const isCim = !!deal.cim_storage_path;
    const isOnMarket = !!deal.listing_url || !!deal.external_id;
    const isFinancials = !!deal.financials_storage_path;
    const isOffMarket = deal.source_type === 'off_market';
    
    // Chat is enabled for all deal types: CIM, on-market, off-market, and financials
    // No need to restrict - all deals can use chat
    
    // Determine source type for context
    let sourceType: string;
    if (isCim) {
      sourceType = "cim_pdf";
    } else if (isFinancials) {
      sourceType = "financials";
    } else if (isOnMarket) {
      sourceType = "on_market";
    } else if (isOffMarket) {
      sourceType = "off_market";
    } else {
      // Default fallback
      sourceType = deal.source_type || "unknown";
    }

    // 6) Rate limit (window)
    const MAX_USER_MESSAGES_PER_WINDOW = 5;
    const recentCount = await chat.getRecentMessageCount(user.id, 60);

    if (recentCount >= MAX_USER_MESSAGES_PER_WINDOW) {
      return NextResponse.json(
        { answer: "Rate limit: please wait a moment before sending more messages.", sources_used: ["rate_limit"] },
        { status: 200 }
      );
    }

    // 7) Hard cap per deal per user (turns)
    const MAX_MESSAGES_PER_DEAL = 30; // turns (user+assistant => *2 rows)
    const totalCount = await chat.getMessageCount(dealId, user.id);

    if (totalCount >= MAX_MESSAGES_PER_DEAL * 2) {
      return NextResponse.json(
        {
          answer:
            "You’ve reached the maximum number of messages for this deal. Clear the chat or move to another deal.",
          sources_used: ["system_limit"],
        },
        { status: 200 }
      );
    }

    // 8) Canonical deal context (server truth) - sanitize text fields
    const dealContext = {
      company_name: sanitizeShortText(deal.company_name ?? ""),
      source_type: sourceType,
      ai_summary: sanitizeForPrompt(deal.ai_summary ?? "", 8000),
      ai_red_flags: sanitizeForPrompt(deal.ai_red_flags ?? "", 8000),
      ai_financials_json: deal.ai_financials_json,
      ai_scoring_json: deal.ai_scoring_json,
      criteria_match_json: deal.criteria_match_json,
      ai_confidence_json: deal.ai_confidence_json,
      raw_listing_text: sanitizeForPrompt(deal.raw_listing_text ?? "", 8000),
      cim_storage_path: deal.cim_storage_path,
      financials_storage_path: deal.financials_storage_path,
      listing_url: sanitizeShortText(deal.listing_url ?? ""),
    };

    // 9) Clean history
    const history = historyRaw
      .slice(-10)
      .filter((m: unknown) => {
        if (!m || typeof m !== "object") return false;
        const role = (m as { role?: unknown }).role;
        return role === "user" || role === "assistant" || role === "system";
      })
      .map((m: unknown) => {
        const msg = m as { role?: ChatRole; content?: unknown };
        return {
          role: msg.role as ChatRole,
          content: String(msg.content ?? "").slice(0, 4000),
        };
      });

    // 10) AI call
    const ai = await chatForDeal({
      userMessage: message,
      dealContext,
      history,
    });

    const answer = ai?.answer ?? "";
    const sources_used = ai?.sources_used ?? ["companies.ai_*"];

    // Check if the answer indicates an error (chatForDeal returns error messages in answer field)
    if (answer.startsWith("Chat failed:") || answer.includes("Server misconfigured")) {
      console.error("Chat AI returned error:", answer);
      return NextResponse.json(
        { error: "Unable to process your question. Please try again later." },
        { status: 500 }
      );
    }

    // 11) Persist (best effort)
    try {
      await chat.addMessages([
        {
          dealId,
          userId: user.id,
          role: "user",
          content: message,
          meta: { sources_used },
        },
        {
          dealId,
          userId: user.id,
          role: "assistant",
          content: answer,
          meta: {
            sources_used,
            model: ai?.model,
            tokens: ai?.tokens,
            latency_ms: ai?.latency_ms,
          },
        },
      ]);
    } catch (err) {
      // Best effort - return response even if persistence fails
      return NextResponse.json({ answer, sources_used, warning: "Failed to persist chat" });
    }

    return NextResponse.json({ answer, sources_used });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    if (e instanceof DatabaseError) {
      // Log database errors with more context
      console.error("deal-chat POST database error:", {
        message: e.message,
        dealId: body?.dealId || "unknown",
        userId: user?.id || "unknown",
      });
      return NextResponse.json(
        { error: "Something went wrong. Please try again later." },
        { status: 500 }
      );
    }
    const error = e instanceof Error ? e : new Error("Unknown error");
    const errorMessage = error.message || String(e);
    const errorStack = error.stack;
    console.error("deal-chat POST error:", {
      message: errorMessage,
      stack: errorStack,
      dealId: body?.dealId || "unknown",
      userId: user?.id || "unknown",
    });
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);
    const chat = new ChatRepository(supabase, workspace.id);

    const dealId = req.nextUrl.searchParams.get("dealId");
    if (!dealId) return NextResponse.json({ error: "Missing dealId" }, { status: 400 });

    const rows = await chat.getMessages(dealId, user.id, 40);

    const messages = rows.map((r) => ({
      role: r.role,
      content: r.content,
    }));

    return NextResponse.json({ messages });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("deal-chat GET error:", error);
    return NextResponse.json({ error: "Unable to load chat history. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);
    const chat = new ChatRepository(supabase, workspace.id);

    const dealId = req.nextUrl.searchParams.get("dealId");
    if (!dealId) return NextResponse.json({ error: "Missing dealId" }, { status: 400 });

    await chat.clearMessages(dealId, user.id);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("deal-chat DELETE error:", error);
    return NextResponse.json({ error: "Unable to clear chat history. Please try again." }, { status: 500 });
  }
}
