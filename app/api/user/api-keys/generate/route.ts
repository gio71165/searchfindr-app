// app/api/user/api-keys/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { generateApiKey, hashApiKey } from "@/lib/api/api-keys";
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
 * POST - Generate a new API key
 * Returns the full key ONCE - user must save it immediately
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await authenticateRequest(req);

    // 1. Check if user has reached limit (5 keys max)
    const { count, error: countError } = await supabaseAdmin
      .from("user_api_keys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("revoked_at", null);

    if (countError) {
      logger.error("Error checking API key count:", countError);
      return json({ error: "Failed to check existing keys" }, 500);
    }

    if (count && count >= 5) {
      return json({ error: "Maximum 5 API keys allowed" }, 400);
    }

    // 2. Get key name from request
    const { name } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return json({ error: "Key name is required" }, 400);
    }

    if (name.length > 100) {
      return json({ error: "Key name must be 100 characters or less" }, 400);
    }

    // 3. Generate API key
    const { fullKey, prefix } = generateApiKey("live");
    const keyHash = await hashApiKey(fullKey);

    // 4. Store in database
    const { data: newKey, error: dbError } = await supabaseAdmin
      .from("user_api_keys")
      .insert({
        user_id: user.id,
        name: name.trim(),
        key_hash: keyHash,
        key_prefix: prefix,
      })
      .select("id, name, key_prefix, created_at, expires_at")
      .single();

    if (dbError || !newKey) {
      logger.error("Error creating API key:", dbError);
      return json({ error: "Failed to create API key" }, 500);
    }

    // 5. Return the FULL key (only time it's shown) + key metadata
    return json({
      apiKey: fullKey, // Full key - ONLY SHOWN ONCE
      keyData: {
        id: newKey.id,
        name: newKey.name,
        key_prefix: newKey.key_prefix,
        created_at: newKey.created_at,
        expires_at: newKey.expires_at,
      },
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, err.statusCode);
    }
    logger.error("API key generation error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
