// lib/api/rate-limit.ts
// Simple in-memory rate limiting per user per endpoint

type RateLimitKey = string; // Format: "userId:endpoint"
type RateLimitEntry = {
  count: number;
  resetAt: number; // Timestamp when the window resets
};

// In-memory store (for production, consider Redis or database)
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
 * @param userId - User ID
 * @param endpoint - Endpoint name (e.g., "process-cim", "process-financials", "off-market-search")
 * @param limit - Maximum requests allowed
 * @param windowSeconds - Time window in seconds (default: 3600 for 1 hour)
 * @returns Object with `allowed` boolean and `remaining` count
 */
export function checkRateLimit(
  userId: string,
  endpoint: string,
  limit: number,
  windowSeconds: number = 3600
): { allowed: boolean; remaining: number; resetAt: number } {
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

/**
 * Get rate limit configuration for an endpoint
 */
export function getRateLimitConfig(endpoint: string): { limit: number; windowSeconds: number } {
  const configs: Record<string, { limit: number; windowSeconds: number }> = {
    "process-cim": { limit: 10, windowSeconds: 3600 }, // 10/hour
    "process-financials": { limit: 20, windowSeconds: 3600 }, // 20/hour
    "off-market-search": { limit: 5, windowSeconds: 3600 }, // 5/hour
  };

  return configs[endpoint] || { limit: 10, windowSeconds: 3600 };
}
