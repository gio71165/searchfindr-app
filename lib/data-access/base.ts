import { SupabaseClient } from "@supabase/supabase-js";

// DatabaseError class for database-related errors
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

// NotFoundError class for resource not found errors
export class NotFoundError extends Error {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Type constraint for query builders that have an eq method.
 * This allows ensureWorkspaceScope to work with any Supabase query builder.
 */
type QueryBuilderWithEq = {
  eq(column: string, value: unknown): QueryBuilderWithEq;
};

/**
 * BaseRepository provides common functionality for data access classes.
 * All repositories should extend this class to get workspace scoping and error handling.
 */
export abstract class BaseRepository {
  protected readonly supabase: SupabaseClient;
  protected readonly workspaceId: string;

  constructor(supabase: SupabaseClient, workspaceId: string) {
    this.supabase = supabase;
    this.workspaceId = workspaceId;
  }

  /**
   * Handles Supabase errors and throws a DatabaseError with a custom message.
   * SECURITY: Never exposes database error details to prevent information leakage.
   * @param error - The error from Supabase
   * @param message - Custom error message to display (user-friendly, no sensitive details)
   * @throws DatabaseError
   */
  protected handleError(error: unknown, message: string): never {
    // Log full error details server-side for debugging (never sent to client)
    if (error instanceof Error) {
      const errorWithCode = error as any;
      // Log detailed error for server-side debugging
      const { logger } = require("@/lib/utils/logger");
      logger.error("Database error", {
        message: error.message,
        code: errorWithCode.code,
        details: errorWithCode.details,
        hint: errorWithCode.hint,
        workspaceId: this.workspaceId,
      });
    }
    
    // Throw sanitized error - never expose database internals
    throw new DatabaseError(message, 500);
  }

  /**
   * Ensures a query is scoped to the current workspace by adding .eq('workspace_id', workspaceId).
   * This method can be chained with other query builder methods.
   * @param query - The Supabase query builder instance (must have an eq method)
   * @returns The query builder with workspace_id filter applied
   */
  protected ensureWorkspaceScope<T extends QueryBuilderWithEq>(query: T): T {
    return query.eq("workspace_id", this.workspaceId) as T;
  }
}
