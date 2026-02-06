// app/api/extension/verify-key/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateApiKeyFormat, verifyApiKey } from "@/lib/api/api-keys";
import { checkRateLimit, getRateLimitConfig } from "@/lib/api/rate-limit";
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
 * Verify an API key and return user_id if valid
 * Rate limited to 100 requests/hour per key
 */
export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    // Validate format
    if (!apiKey || typeof apiKey !== "string") {
      return json({ error: "API key is required" }, 400);
    }

    if (!validateApiKeyFormat(apiKey)) {
      return json(
        { error: "Invalid API key format. Must start with sf_live_ or sf_test_" },
        401
      );
    }

    // Look up all keys for this prefix (we'll verify the hash)
    // Since bcrypt hashes are salted, we can't query by hash directly
    // Instead, we query by prefix and verify each one
    const keyPrefix = apiKey.substring(0, 12);
    
    const { data: keyRecords, error } = await supabaseAdmin
      .from("user_api_keys")
      .select("id, user_id, expires_at, revoked_at, name, key_hash")
      .eq("key_prefix", keyPrefix)
      .is("revoked_at", null);

    if (error || !keyRecords || keyRecords.length === 0) {
      logger.warn("API key verification failed: key not found", {
        keyPrefix,
      });
      return json({ error: "Invalid API key" }, 401);
    }

    // Verify the API key against all matching prefixes using bcrypt.compare
    let keyRecord = null;
    for (const record of keyRecords) {
      const isValid = await verifyApiKey(apiKey, record.key_hash);
      if (isValid) {
        keyRecord = record;
        break;
      }
    }

    if (!keyRecord) {
      logger.warn("API key verification failed: hash mismatch", {
        keyPrefix,
      });
      return json({ error: "Invalid API key" }, 401);
    }

    // Check if revoked
    if (keyRecord.revoked_at) {
      logger.warn("API key verification failed: key revoked", {
        keyId: keyRecord.id,
        userId: keyRecord.user_id,
      });
      return json({ error: "API key has been revoked" }, 401);
    }

    // Check if expired
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      logger.warn("API key verification failed: key expired", {
        keyId: keyRecord.id,
        userId: keyRecord.user_id,
      });
      return json({ error: "API key has expired" }, 401);
    }

    // Rate limiting per key (100 requests/hour)
    const rateLimitConfig = getRateLimitConfig("api-key-verify");
    const rateLimit = await checkRateLimit(
      keyRecord.id, // Use key ID as the rate limit identifier
      "api-key-verify",
      rateLimitConfig.limit,
      rateLimitConfig.windowSeconds,
      supabaseAdmin
    );

    if (!rateLimit.allowed) {
      logger.warn("API key rate limit exceeded", {
        keyId: keyRecord.id,
        userId: keyRecord.user_id,
      });
      return json(
        {
          error: `Rate limit exceeded. Maximum ${rateLimitConfig.limit} requests per hour.`,
        },
        429
      );
    }

    // Update last_used_at
    await supabaseAdmin
      .from("user_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id);

    // Get workspace_id for the user
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("workspace_id")
      .eq("id", keyRecord.user_id)
      .single();

    return json({
      valid: true,
      user_id: keyRecord.user_id,
      workspace_id: profile?.workspace_id || null,
      key_name: keyRecord.name,
    });
  } catch (err: any) {
    logger.error("API key verification error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
