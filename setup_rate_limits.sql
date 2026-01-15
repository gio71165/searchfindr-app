-- ============================================================
-- RATE LIMITS TABLE SETUP
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================================

-- Create the rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on key for fast lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);

-- Create index on reset_at for cleanup queries (expired entries)
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Ensure RLS is disabled (server-only table)
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.rate_limits IS 'Distributed rate limiting table. Stores rate limit counters keyed by userId:endpoint.';
COMMENT ON COLUMN public.rate_limits.key IS 'Rate limit key format: ratelimit:{userId}:{endpoint}';
COMMENT ON COLUMN public.rate_limits.count IS 'Current request count within the time window';
COMMENT ON COLUMN public.rate_limits.reset_at IS 'Timestamp when the rate limit window resets';

-- ============================================================
-- VERIFICATION QUERIES (run these after setup)
-- ============================================================

-- 1. Verify table exists (should return 'rate_limits')
SELECT to_regclass('public.rate_limits');

-- 2. Verify table structure (should show 6 columns)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'rate_limits'
ORDER BY ordinal_position;

-- 3. Verify indexes (should show 3 indexes)
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'rate_limits'
ORDER BY indexname;

-- 4. Verify RLS is disabled (rowsecurity should be 'f')
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'rate_limits';
