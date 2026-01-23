import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { logger } from "@/lib/utils/logger";

export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
}

/**
 * Standardized error handler for API routes
 * Ensures consistent error response format and proper status codes
 */
export function handleApiError(error: unknown): NextResponse {
  // Auth errors
  if (error instanceof AuthError) {
    logger.warn("Auth error:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  // Database errors (from BaseRepository)
  if (error instanceof Error) {
    const errorMessage = error.message;
    
    // Don't log sensitive information
    if (errorMessage.includes('token') || errorMessage.includes('password')) {
      logger.error("Database error (sanitized)");
    } else {
      logger.error("API error:", errorMessage);
    }

    // Determine status code from error message
    let statusCode = 500;
    if (errorMessage.includes('not found') || errorMessage.includes('NotFound')) {
      statusCode = 404;
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('Unauthorized')) {
      statusCode = 401;
    } else if (errorMessage.includes('forbidden') || errorMessage.includes('Forbidden')) {
      statusCode = 403;
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      statusCode = 400;
    }

    return NextResponse.json(
      { error: errorMessage || "An error occurred" },
      { status: statusCode }
    );
  }

  // Unknown errors
  logger.error("Unknown API error:", error);
  return NextResponse.json(
    { error: "An unexpected error occurred" },
    { status: 500 }
  );
}

/**
 * Wrapper for API route handlers to ensure consistent error handling
 */
export function withErrorHandler(
  handler: (req: Request) => Promise<NextResponse>
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
