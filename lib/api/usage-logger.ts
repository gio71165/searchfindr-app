// lib/api/usage-logger.ts
// Usage logging middleware for API endpoints

import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

interface LogUsageParams {
  userId?: string;
  workspaceId?: string;
  endpoint: string;
  method?: string;
  statusCode?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log API usage to the usage_logs table
 * Uses service role key to bypass RLS
 */
export async function logUsage(params: LogUsageParams): Promise<void> {
  try {
    // Use service role key for logging (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Missing Supabase credentials for usage logging');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    await supabase.from('usage_logs').insert({
      user_id: params.userId || null,
      workspace_id: params.workspaceId || null,
      endpoint: params.endpoint,
      method: params.method || 'GET',
      status_code: params.statusCode || null,
      response_time_ms: params.responseTimeMs || null,
      error_message: params.errorMessage || null,
      metadata: params.metadata || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Failed to log usage:', error);
  }
}

/**
 * Helper to extract IP address from request
 */
export function getIpAddress(req: Request): string | undefined {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || undefined;
}

/**
 * Helper to extract user agent from request
 */
export function getUserAgent(req: Request): string | undefined {
  return req.headers.get('user-agent') || undefined;
}
