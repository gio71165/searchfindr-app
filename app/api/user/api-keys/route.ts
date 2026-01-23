// app/api/user/api-keys/route.ts
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
 * GET - List user's API keys
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await authenticateRequest(req);

    const { data: keys, error } = await supabaseAdmin
      .from("user_api_keys")
      .select("id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching API keys:", error);
      return json({ error: "Failed to fetch API keys" }, 500);
    }

    return json({ keys: keys || [] });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, err.statusCode);
    }
    logger.error("API keys GET error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
