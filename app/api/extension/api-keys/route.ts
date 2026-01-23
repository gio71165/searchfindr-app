// app/api/extension/api-keys/route.ts
// CRUD operations for user API keys
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { generateApiKey, hashApiKey } from "@/lib/api/api-keys";
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
 * GET - List user's API keys (excluding key_hash for security)
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

/**
 * POST - Create a new API key
 * Returns the full key ONCE - user must save it immediately
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await authenticateRequest(req);
    const { name, environment = "live" } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return json({ error: "Key name is required" }, 400);
    }

    if (name.length > 100) {
      return json({ error: "Key name must be 100 characters or less" }, 400);
    }

    // Check existing key count (max 5 per user)
    const { data: existingKeys, error: countError } = await supabaseAdmin
      .from("user_api_keys")
      .select("id")
      .eq("user_id", user.id)
      .is("revoked_at", null);

    if (countError) {
      logger.error("Error checking existing keys:", countError);
      return json({ error: "Failed to check existing keys" }, 500);
    }

    if (existingKeys && existingKeys.length >= 5) {
      return json(
        { error: "Maximum of 5 API keys allowed. Please revoke an existing key first." },
        400
      );
    }

    // Generate new API key
    const { fullKey, prefix } = generateApiKey(environment as "live" | "test");
    const keyHash = await hashApiKey(fullKey);

    // Insert into database
    const { data: newKey, error: insertError } = await supabaseAdmin
      .from("user_api_keys")
      .insert({
        user_id: user.id,
        name: name.trim(),
        key_hash: keyHash,
        key_prefix: prefix,
      })
      .select("id, name, key_prefix, created_at, expires_at")
      .single();

    if (insertError || !newKey) {
      logger.error("Error creating API key:", insertError);
      return json({ error: "Failed to create API key" }, 500);
    }

    // Return the full key ONCE - user must save it
    return json({
      success: true,
      key: {
        id: newKey.id,
        name: newKey.name,
        fullKey, // Only returned once!
        key_prefix: newKey.key_prefix,
        created_at: newKey.created_at,
        expires_at: newKey.expires_at,
      },
      warning: "Save this API key now. You won't be able to see it again.",
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, err.statusCode);
    }
    logger.error("API keys POST error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

/**
 * PATCH - Update API key name or revoke it
 */
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await authenticateRequest(req);
    const { id, name, revoked } = await req.json();

    if (!id) {
      return json({ error: "Key ID is required" }, 400);
    }

    // Verify key belongs to user
    const { data: key, error: fetchError } = await supabaseAdmin
      .from("user_api_keys")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !key || key.user_id !== user.id) {
      return json({ error: "API key not found" }, 404);
    }

    // Build update object
    const updates: any = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return json({ error: "Key name cannot be empty" }, 400);
      }
      if (name.length > 100) {
        return json({ error: "Key name must be 100 characters or less" }, 400);
      }
      updates.name = name.trim();
    }

    if (revoked === true) {
      updates.revoked_at = new Date().toISOString();
    } else if (revoked === false) {
      updates.revoked_at = null;
    }

    // Update key
    const { data: updatedKey, error: updateError } = await supabaseAdmin
      .from("user_api_keys")
      .update(updates)
      .eq("id", id)
      .select("id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at")
      .single();

    if (updateError || !updatedKey) {
      logger.error("Error updating API key:", updateError);
      return json({ error: "Failed to update API key" }, 500);
    }

    return json({ success: true, key: updatedKey });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, err.statusCode);
    }
    logger.error("API keys PATCH error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
