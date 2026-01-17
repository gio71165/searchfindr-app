import { NextRequest } from "next/server";
import { createClient as createSupabase, SupabaseClient } from "@supabase/supabase-js";
import { User } from "@supabase/supabase-js";

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

  // 2) Create authenticated Supabase client
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

  // 3) Get user from token
  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData?.user) {
    // Log detailed error for debugging
    console.error("Auth token validation failed:", {
      error: authErr ? {
        message: authErr.message,
        status: authErr.status,
        name: authErr.name,
      } : "No error object",
      hasUser: !!authData?.user,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + "...",
    });
    throw new AuthError("Unauthorized (bad token)", 401);
  }
  const user = authData.user;

  // 4) Get workspace ID for user
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
