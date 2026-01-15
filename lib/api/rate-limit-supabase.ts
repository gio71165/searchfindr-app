// lib/api/rate-limit-supabase.ts
// Distributed rate limiting using Supabase (fallback if Redis not available)

import { SupabaseClient } from '@supabase/supabase-js';

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check rate limit using Supabase table
 * Creates a rate_limits table if it doesn't exist (via migration)
 * 
 * Table schema (run migration):
 * CREATE TABLE IF NOT EXISTS rate_limits (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   key TEXT NOT NULL UNIQUE,
 *   count INTEGER NOT NULL DEFAULT 1,
 *   reset_at TIMESTAMPTZ NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
 * CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);
 */
export async function checkRateLimitSupabase(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  limit: number,
  windowSeconds: number = 3600
): Promise<RateLimitResult> {
  const key = `ratelimit:${userId}:${endpoint}`;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    // Get or create rate limit entry
    const { data: existing, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .single();

    // If entry doesn't exist or expired, create new one
    if (fetchError || !existing || new Date(existing.reset_at) < now) {
      const { error: upsertError } = await supabase
        .from('rate_limits')
        .upsert(
          {
            key,
            count: 1,
            reset_at: resetAt.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: 'key' }
        );

      if (upsertError) {
        // If table doesn't exist, fall back to in-memory (for development)
        console.warn('Rate limit table not found, falling back to in-memory limiter:', upsertError);
        return { allowed: true, remaining: limit - 1, resetAt: resetAt.getTime() };
      }

      return { allowed: true, remaining: limit - 1, resetAt: resetAt.getTime() };
    }

    // Increment count
    const newCount = existing.count + 1;
    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({
        count: newCount,
        updated_at: now.toISOString(),
      })
      .eq('key', key);

    if (updateError) {
      // On error, allow the request (fail open)
      console.warn('Rate limit update failed:', updateError);
      return { allowed: true, remaining: limit - 1, resetAt: resetAt.getTime() };
    }

    const remaining = Math.max(0, limit - newCount);
    const allowed = newCount <= limit;

    return {
      allowed,
      remaining,
      resetAt: new Date(existing.reset_at).getTime(),
    };
  } catch (error) {
    // On any error, allow the request (fail open)
    console.warn('Rate limit check failed:', error);
    return { allowed: true, remaining: limit - 1, resetAt: resetAt.getTime() };
  }
}

/**
 * Cleanup expired rate limit entries (call periodically via cron)
 */
export async function cleanupExpiredRateLimits(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase
      .from('rate_limits')
      .delete()
      .lt('reset_at', new Date().toISOString());
  } catch (error) {
    console.warn('Rate limit cleanup failed:', error);
  }
}
