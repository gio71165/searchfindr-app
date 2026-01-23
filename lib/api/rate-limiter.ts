// lib/api/rate-limiter.ts
// Optimized in-memory rate limiting with database fallback for audit logs only

import NodeCache from 'node-cache';
import type { SupabaseClient } from '@supabase/supabase-js';

type RateLimitKey = string; // Format: "userId:endpoint"
type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

// In-memory cache with TTL matching rate limit windows
// TTL is set to windowSeconds to auto-expire entries
const rateLimitCache = new NodeCache({
  stdTTL: 3600, // Default 1 hour TTL
  checkperiod: 300, // Check for expired keys every 5 minutes
  useClones: false, // Better performance
});

/**
 * Optimized rate limiting: Uses in-memory cache first, only hits database for audit logs when limit exceeded
 * 
 * This reduces database load from ~100 calls/min to ~0-1 calls/min for rate limiting.
 * 
 * Note: For multi-instance deployments (Vercel), use Redis/Upstash instead of NodeCache.
 * 
 * @param userId - User ID
 * @param endpoint - Endpoint name
 * @param limit - Maximum requests allowed
 * @param windowSeconds - Time window in seconds
 * @param supabase - Optional Supabase client for audit logging (only used when limit exceeded)
 * @returns Rate limit result
 */
export async function checkRateLimitOptimized(
  userId: string,
  endpoint: string,
  limit: number,
  windowSeconds: number = 3600,
  supabase?: SupabaseClient
): Promise<RateLimitResult> {
  const key: RateLimitKey = `${userId}:${endpoint}`;
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;

  // Get current count from cache
  const cached = rateLimitCache.get<{ count: number; resetAt: number }>(key);
  
  let count: number;
  let entryResetAt: number;

  if (!cached || cached.resetAt < now) {
    // New window or expired entry
    count = 1;
    entryResetAt = resetAt;
    rateLimitCache.set(key, { count, resetAt: entryResetAt }, windowSeconds);
  } else {
    // Increment existing count
    count = cached.count + 1;
    entryResetAt = cached.resetAt;
    rateLimitCache.set(key, { count, resetAt: entryResetAt }, windowSeconds);
  }

  const remaining = Math.max(0, limit - count);
  const allowed = count <= limit;

  // Only log to database if rate limit exceeded (for audit purposes)
  // This reduces database calls from every request to only when limits are hit
  if (!allowed && supabase) {
    try {
      // Log rate limit violation to database (async, don't wait)
      Promise.resolve(supabase.from('rate_limit_violations').insert({
        user_id: userId,
        endpoint,
        count,
        limit_value: limit,
        window_seconds: windowSeconds,
        created_at: new Date().toISOString(),
      })).catch(() => {
        // Silently fail - audit logging shouldn't break the app
      });
    } catch {
      // Ignore errors
    }
  }

  return { allowed, remaining, resetAt: entryResetAt };
}

// Re-export from shared config
export { getRateLimitConfig } from './rate-limit-config';
