-- ============================================
-- Migration: Enable RLS for Security Tables
-- Date: 2026-01-29
-- Description: Enable RLS on usage_logs, rate_limits, and guest_cim_uploads
--              to fix Supabase security linter warnings
-- ============================================

-- ============================================
-- PART 1: Fix usage_logs table
-- ============================================

-- Enable RLS (it was disabled in migration 004)
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (it was created but RLS was disabled)
DROP POLICY IF EXISTS "Admins can view all usage logs" ON usage_logs;

-- Policy: Admins can view all usage logs
CREATE POLICY "Admins can view all usage logs"
  ON usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = TRUE
    )
  );

-- Policy: Service role can insert (service role bypasses RLS, but this documents intent)
-- Note: Service role key bypasses RLS automatically, but having a policy is good practice
-- For authenticated users inserting their own logs, we allow it
CREATE POLICY "Users can insert their own usage logs"
  ON usage_logs
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = TRUE
    )
  );

-- ============================================
-- PART 2: Fix rate_limits table
-- ============================================

-- Create rate_limits table if it doesn't exist (based on schema in rate-limit-supabase.ts)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (service role bypasses RLS anyway)
-- For authenticated users, they can only access their own rate limits
-- Rate limit keys are in format: "ratelimit:{userId}:{endpoint}"
CREATE POLICY "Users can view their own rate limits"
  ON rate_limits
  FOR SELECT
  USING (
    key LIKE 'ratelimit:' || (select auth.uid())::text || ':%' OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Users can manage their own rate limits"
  ON rate_limits
  FOR ALL
  USING (
    key LIKE 'ratelimit:' || (select auth.uid())::text || ':%' OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = TRUE
    )
  )
  WITH CHECK (
    key LIKE 'ratelimit:' || (select auth.uid())::text || ':%' OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = TRUE
    )
  );

-- ============================================
-- PART 3: Fix guest_cim_uploads table
-- ============================================

-- Enable RLS
ALTER TABLE guest_cim_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts (for guest uploads)
-- But restrict reads to admins only (privacy protection)
CREATE POLICY "Guests can insert uploads"
  ON guest_cim_uploads
  FOR INSERT
  WITH CHECK (true); -- Allow anonymous inserts

CREATE POLICY "Admins can view guest uploads"
  ON guest_cim_uploads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = TRUE
    )
  );

-- Policy: Admins can delete guest uploads (for cleanup)
CREATE POLICY "Admins can delete guest uploads"
  ON guest_cim_uploads
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = TRUE
    )
  );
