// lib/api/rate-limit-config.ts
// Shared rate limit configuration to avoid duplication

export function getRateLimitConfig(endpoint: string): { limit: number; windowSeconds: number } {
  const configs: Record<string, { limit: number; windowSeconds: number }> = {
    "process-cim": { limit: 10, windowSeconds: 3600 }, // 10/hour
    "process-financials": { limit: 20, windowSeconds: 3600 }, // 20/hour
    "off-market-search": { limit: 5, windowSeconds: 3600 }, // 5/hour
    "on-market-search": { limit: 100, windowSeconds: 3600 }, // 100/hour
    "analyze-text": { limit: 20, windowSeconds: 3600 }, // 20/hour
    "capture-deal": { limit: 30, windowSeconds: 3600 }, // 30/hour
    "deal-chat": { limit: 60, windowSeconds: 3600 }, // 60/hour
    "compare-deals": { limit: 100, windowSeconds: 3600 }, // 100/hour
    "api-key-verify": { limit: 100, windowSeconds: 3600 }, // 100/hour per key
  };

  return configs[endpoint] || { limit: 10, windowSeconds: 3600 };
}
