// lib/api/security-middleware.ts
// Security middleware and utilities for API routes

import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "./security";

/**
 * Security headers to add to all API responses.
 * Protects against common attacks like XSS, clickjacking, etc.
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent XSS attacks
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    
    // Strict transport security (HTTPS only in production)
    ...(process.env.NODE_ENV === "production" && {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    }),
    
    // Content Security Policy
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://*.supabase.co;",
    
    // Referrer policy
    "Referrer-Policy": "strict-origin-when-cross-origin",
    
    // Permissions policy
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  };
}

/**
 * Validates request origin to prevent CSRF attacks.
 * Only allows requests from trusted origins.
 */
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  
  // Allow same-origin requests (no origin header)
  if (!origin) {
    return true;
  }

  // Get allowed origins from environment
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()) || [];
  
  // Add default production origin
  if (process.env.NODE_ENV === "production") {
    allowedOrigins.push("https://searchfindr-app.vercel.app");
  } else {
    // Development: allow localhost
    allowedOrigins.push("http://localhost:3000");
  }

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(allowed => {
    try {
      const originUrl = new URL(origin);
      const allowedUrl = new URL(allowed);
      return originUrl.origin === allowedUrl.origin;
    } catch {
      return false;
    }
  });

  return isAllowed;
}

/**
 * Validates request method and adds security headers.
 * Use this as middleware in API routes.
 */
export function withSecurityHeaders(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    // Validate origin for state-changing requests
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      if (!validateOrigin(req)) {
        return NextResponse.json(
          { error: "Invalid origin" },
          { status: 403, headers: getSecurityHeaders() }
        );
      }
    }

    // Execute handler
    const response = await handler(req);

    // Add security headers to response
    const headers = new Headers(response.headers);
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });

    // Add CORS headers
    Object.entries(getCorsHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Validates that required environment variables are set.
 * Throws an error if any are missing.
 */
export function requireEnvVars(...varNames: string[]): void {
  const missing: string[] = [];
  
  for (const varName of varNames) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

/**
 * Sanitizes user input to prevent injection attacks.
 * Removes or escapes potentially dangerous characters.
 */
export function sanitizeInput(input: string, maxLength: number = 10000): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .slice(0, maxLength)
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

/**
 * Validates UUID format to prevent injection attacks.
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
