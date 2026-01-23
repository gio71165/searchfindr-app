// lib/api/api-keys.ts
// Utilities for API key generation, hashing, and verification

import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

/**
 * Generate a new API key
 * Format: sf_live_{32_random_chars} or sf_test_{32_random_chars}
 */
export function generateApiKey(environment: "live" | "test" = "live"): {
  fullKey: string;
  prefix: string;
} {
  // Generate 32 random hex characters
  const randomBytes = crypto.randomBytes(16).toString("hex");
  const fullKey = `sf_${environment}_${randomBytes}`;
  const prefix = fullKey.substring(0, 12); // "sf_live_abcd"

  return { fullKey, prefix };
}

/**
 * Hash an API key using bcrypt
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, SALT_ROUNDS);
}

/**
 * Verify an API key against a hash
 */
export async function verifyApiKey(
  apiKey: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
}

/**
 * Validate API key format
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== "string") {
    return false;
  }
  // Must start with sf_live_ or sf_test_ and have at least 32 more chars
  return /^sf_(live|test)_[a-f0-9]{32,}$/i.test(apiKey);
}

/**
 * Extract prefix from API key for display
 */
export function getApiKeyPrefix(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return "sf_...";
  }
  return apiKey.substring(0, 12) + "...";
}
