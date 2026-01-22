-- Optional: Rate Limit Violations Audit Table
-- This table is used for logging rate limit violations (optional audit logging)
-- The app will work fine without this table - violations just won't be logged to DB

CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  count INTEGER NOT NULL,
  limit_value INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying violations by user
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user_id 
ON rate_limit_violations(user_id, created_at DESC);

-- Index for querying violations by endpoint
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_endpoint 
ON rate_limit_violations(endpoint, created_at DESC);

-- Disable RLS (server-only table)
ALTER TABLE rate_limit_violations DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE rate_limit_violations IS 'Optional audit log for rate limit violations. Used for monitoring and analytics.';
