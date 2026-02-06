import { NextRequest } from "next/server";
import { createClient as createSupabase, SupabaseClient } from "@supabase/supabase-js";
import { User } from "@supabase/supabase-js";
import { validateApiKeyFormat, verifyApiKey } from "./api-keys";

// AuthError class for authentication-related errors
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Authenticate using API key (for Chrome extension)
 * Note: bcrypt hashes are salted, so we query by prefix and verify each match
 */
async function authenticateWithApiKey(
  apiKey: string
): Promise<{ user_id: string; workspace_id: string }> {
  const supabaseAdmin = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  if (!validateApiKeyFormat(apiKey)) {
    throw new AuthError("Invalid API key format", 401);
  }

  // Extract prefix to query by (bcrypt hashes are salted, can't query by hash directly)
  const keyPrefix = apiKey.substring(0, 12);
  
  const { data: keyRecords, error } = await supabaseAdmin
    .from("user_api_keys")
    .select("id, user_id, expires_at, revoked_at, key_hash")
    .eq("key_prefix", keyPrefix)
    .is("revoked_at", null);

  if (error || !keyRecords || keyRecords.length === 0) {
    throw new AuthError("Invalid API key", 401);
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
    throw new AuthError("Invalid API key", 401);
  }

  if (keyRecord.revoked_at) {
    throw new AuthError("API key has been revoked", 401);
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    throw new AuthError("API key has expired", 401);
  }

  // Get workspace_id (required to scope deals; every user with Settings access should have one)
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("workspace_id")
    .eq("id", keyRecord.user_id)
    .single();

  if (!profile?.workspace_id) {
    throw new AuthError(
      "Account setup incomplete. Please open Settings in the app and try again, or contact support.",
      500
    );
  }

  // Update last_used_at
  await supabaseAdmin
    .from("user_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id);

  return {
    user_id: keyRecord.user_id,
    workspace_id: profile.workspace_id,
  };
}

// Combined authentication function
export async function authenticateRequest(
  req: NextRequest
): Promise<{
  supabase: SupabaseClient;
  user: User;
  workspace: { id: string };
}> {
  // 1) Extract bearer token
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new AuthError("Unauthorized (missing token)", 401);
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new AuthError("Unauthorized (missing token)", 401);
  }

  // 2) Check if it's an API key (starts with sf_)
  if (token.startsWith("sf_")) {
    const { user_id, workspace_id } = await authenticateWithApiKey(token);

    // Create a service role client for API key auth
    const supabase = createSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Get user object
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !userData?.user) {
      throw new AuthError("User not found", 404);
    }

    return {
      supabase,
      user: userData.user,
      workspace: { id: workspace_id },
    };
  }

  // 3) Otherwise, treat as OAuth JWT token
  const supabase = createSupabase(
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

  // 4) Get user from token
  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData?.user) {
    // Log error without sensitive token data
    const { logger } = await import("@/lib/utils/logger");
    logger.error("Auth token validation failed:", {
      error: authErr ? {
        message: authErr.message,
        status: authErr.status,
        name: authErr.name,
      } : "No error object",
      hasUser: !!authData?.user,
      // Do not log token length or prefix - security risk
    });
    throw new AuthError("Unauthorized (bad token)", 401);
  }
  const user = authData.user;

  // 5) Get workspace ID for user
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile?.workspace_id) {
    throw new AuthError("Profile/workspace not found", 403);
  }

  return {
    supabase,
    user,
    workspace: { id: profile.workspace_id },
  };
}
