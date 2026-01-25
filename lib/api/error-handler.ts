// lib/api/error-handler.ts
// Centralized error handling to prevent information leakage

import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { DatabaseError, NotFoundError } from "@/lib/data-access/base";
import { logger } from "@/lib/utils/logger";

/**
 * Sanitizes error messages to prevent information leakage.
 * Only returns safe, user-friendly error messages.
 */
function sanitizeErrorMessage(error: unknown, isDevelopment: boolean = false): string {
  // In development, show more details for debugging
  if (isDevelopment && error instanceof Error) {
    return error.message;
  }

  // Handle known error types
  if (error instanceof AuthError) {
    return "Authentication failed. Please check your credentials.";
  }

  if (error instanceof NotFoundError) {
    return "The requested resource was not found.";
  }

  if (error instanceof DatabaseError) {
    // Never expose database error details to users
    return "A database error occurred. Please try again later.";
  }

  // Generic error handling
  if (error instanceof Error) {
    // Check for sensitive patterns that should never be exposed
    const message = error.message.toLowerCase();
    
    // Never expose these patterns
    if (
      message.includes('sql') ||
      message.includes('database') ||
      message.includes('connection') ||
      message.includes('query') ||
      message.includes('schema') ||
      message.includes('table') ||
      message.includes('column') ||
      message.includes('constraint') ||
      message.includes('violation') ||
      message.includes('permission denied') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('api key') ||
      message.includes('token') ||
      message.includes('secret') ||
      message.includes('password') ||
      message.includes('credential')
    ) {
      return "An error occurred. Please try again later.";
    }

    // For other errors, return a generic message
    return "An unexpected error occurred. Please try again later.";
  }

  return "An unexpected error occurred. Please try again later.";
}

/**
 * Centralized error handler for API routes.
 * Ensures consistent error responses and prevents information leakage.
 */
export function handleApiError(
  error: unknown,
  context?: {
    endpoint?: string;
    userId?: string;
    additionalInfo?: Record<string, unknown>;
  }
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Log full error details server-side (never sent to client)
  if (error instanceof Error) {
    logger.error("API Error", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      endpoint: context?.endpoint,
      userId: context?.userId,
      ...context?.additionalInfo,
    });
  } else {
    logger.error("API Error (non-Error object)", {
      error: String(error),
      endpoint: context?.endpoint,
      userId: context?.userId,
      ...context?.additionalInfo,
    });
  }

  // Determine status code
  let statusCode = 500;
  if (error instanceof AuthError) {
    statusCode = error.statusCode;
  } else if (error instanceof NotFoundError) {
    statusCode = 404;
  } else if (error instanceof DatabaseError) {
    statusCode = error.statusCode;
  }

  // Return sanitized error message
  const safeMessage = sanitizeErrorMessage(error, isDevelopment);

  return NextResponse.json(
    { error: safeMessage },
    { status: statusCode }
  );
}

/**
 * Wraps an async API route handler with error handling.
 * Use this to automatically catch and handle errors.
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  context?: { endpoint?: string }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract userId if available from request
      let userId: string | undefined;
      try {
        const req = args[0] as { headers?: Headers };
        if (req?.headers) {
          // Try to extract user ID from auth context if available
          // This is a best-effort extraction
        }
      } catch {
        // Ignore errors extracting context
      }

      return handleApiError(error, {
        endpoint: context?.endpoint,
        userId,
      });
    }
  }) as T;
}
