// lib/api/rate-limit.ts
// Distributed rate limiting with Supabase fallback to in-memory

import { SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimitSupabase } from './rate-limit-supabase';

type RateLimitKey = string; // Format: "userId:endpoint"
type RateLimitEntry = {
  count: number;
  resetAt: number; // Timestamp when the window resets
};

// In-memory store (fallback if Supabase table doesn't exist)
const rateLimitStore = new Map<RateLimitKey, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a user has exceeded the rate limit for an endpoint
 * Uses Supabase for distributed rate limiting if supabase client is provided,
 * otherwise falls back to in-memory storage.
 * 
 * @param userId - User ID
 * @param endpoint - Endpoint name (e.g., "process-cim", "process-financials", "off-market-search")
 * @param limit - Maximum requests allowed
 * @param windowSeconds - Time window in seconds (default: 3600 for 1 hour)
 * @param supabase - Optional Supabase client for distributed rate limiting
 * @returns Object with `allowed` boolean and `remaining` count
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  limit: number,
  windowSeconds: number = 3600,
  supabase?: SupabaseClient
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  // Use Supabase if provided (distributed rate limiting)
  if (supabase) {
    return await checkRateLimitSupabase(supabase, userId, endpoint, limit, windowSeconds);
  }

  // Fallback to in-memory (for development or if Supabase table doesn't exist)
  const key: RateLimitKey = `${userId}:${endpoint}`;
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;

  const entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  // Increment count
  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;

  return { allowed, remaining, resetAt: entry.resetAt };
}

// Re-export from shared config
export { getRateLimitConfig } from './rate-limit-config';
