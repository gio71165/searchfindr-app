// Simple audit logging — verdicts, exports, key actions
import type { SupabaseClient } from '@supabase/supabase-js';

type AuditParams = {
  workspace_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
};

export async function logAudit(
  supabase: SupabaseClient,
  params: AuditParams
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      workspace_id: params.workspace_id,
      user_id: params.user_id,
      action: params.action,
      resource_type: params.resource_type,
      resource_id: params.resource_id ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    // Don't fail the request if audit insert fails
  }
}
