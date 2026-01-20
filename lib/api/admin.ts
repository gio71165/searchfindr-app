// lib/api/admin.ts
// Admin authentication and authorization utilities

import { SupabaseClient, User } from '@supabase/supabase-js';
import { AuthError } from './auth';

export class AdminError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 403
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

/**
 * Check if a user is an admin
 */
export async function checkIsAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_admin === true;
}

/**
 * Authenticate and verify admin access
 * Throws AdminError if user is not an admin
 */
export async function authenticateAdmin(
  supabase: SupabaseClient,
  user: User
): Promise<void> {
  const isAdmin = await checkIsAdmin(supabase, user.id);
  
  if (!isAdmin) {
    throw new AdminError('Admin access required', 403);
  }
}

/**
 * Get admin user info
 */
export async function getAdminUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string; email: string; is_admin: boolean } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  // Get email from auth.users
  const { data: authData } = await supabase.auth.admin.getUserById(userId);
  const email = authData?.user?.email || 'Unknown';

  return {
    id: userId,
    email,
    is_admin: data.is_admin === true,
  };
}
