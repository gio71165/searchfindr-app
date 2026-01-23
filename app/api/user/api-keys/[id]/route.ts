// app/api/user/api-keys/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "@/lib/api/security";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

const corsHeaders = getCorsHeaders();

function json(resBody: any, status = 200) {
  return NextResponse.json(resBody, { status, headers: corsHeaders });
}

/**
 * PATCH - Rename an API key
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await authenticateRequest(req);
    const { name } = await req.json();
    const { id } = await params;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return json({ error: "Key name is required" }, 400);
    }

    if (name.length > 100) {
      return json({ error: "Key name must be 100 characters or less" }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from("user_api_keys")
      .update({ name: name.trim() })
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user owns this key
      .select("id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at")
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116") {
        return json({ error: "API key not found" }, 404);
      }
      logger.error("Error renaming API key:", error);
      return json({ error: "Failed to rename API key" }, 500);
    }

    return json({ key: data });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, err.statusCode);
    }
    logger.error("API key PATCH error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

/**
 * DELETE - Revoke an API key (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await authenticateRequest(req);
    const { id } = await params;

    // Soft delete - set revoked_at
    const { data, error } = await supabaseAdmin
      .from("user_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user owns this key
      .select("id")
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116") {
        return json({ error: "API key not found" }, 404);
      }
      logger.error("Error revoking API key:", error);
      return json({ error: "Failed to revoke API key" }, 500);
    }

    return json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, err.statusCode);
    }
    logger.error("API key DELETE error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
