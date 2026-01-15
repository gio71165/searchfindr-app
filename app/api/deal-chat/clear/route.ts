import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { ChatRepository } from "@/lib/data-access/chat";
import { logger } from "@/lib/utils/logger";

export async function POST(req: NextRequest) {
  try {
    // Use centralized authentication helper
    const { supabase, user, workspace } = await authenticateRequest(req);
    const chat = new ChatRepository(supabase, workspace.id);

    const body = await req.json().catch(() => null);
    const dealId = body?.dealId;
    if (!dealId) {
      return NextResponse.json({ error: "Missing dealId" }, { status: 400 });
    }

    // Clear messages using repository (workspace-scoped)
    await chat.clearMessages(dealId, user.id);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    const error = e instanceof Error ? e : new Error("Unknown error");
    logger.error("deal-chat clear error:", error);
    return NextResponse.json(
      { error: "Unable to clear chat. Please try again." },
      { status: 500 }
    );
  }
}
