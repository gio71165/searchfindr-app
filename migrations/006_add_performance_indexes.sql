-- Performance Indexes for Dashboard and Common Queries
-- Created to optimize frequently used query patterns
--
-- NOTE: These indexes are created without CONCURRENTLY to work in Supabase SQL Editor.
-- For production with large tables, consider running these individually with CONCURRENTLY
-- outside of a transaction block to avoid table locks.

-- Index for dashboard query (most common)
-- Optimizes: workspace_id filter + created_at ordering + passed_at/archived_at filters
CREATE INDEX IF NOT EXISTS idx_companies_dashboard 
ON companies(workspace_id, created_at DESC)
WHERE passed_at IS NULL AND archived_at IS NULL;

-- Index for deal lookups by ID + workspace
-- Optimizes: Individual deal fetches with workspace security check
CREATE INDEX IF NOT EXISTS idx_companies_workspace_id 
ON companies(workspace_id, id);

-- Index for profiles lookup (hot path in auth)
-- Optimizes: User profile lookups during authentication
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(id);

-- Index for "Today" view (next_action_date queries)
-- Optimizes: Follow-up due date queries in Today view
CREATE INDEX IF NOT EXISTS idx_companies_next_action 
ON companies(workspace_id, next_action_date)
WHERE next_action_date IS NOT NULL 
  AND passed_at IS NULL 
  AND archived_at IS NULL;

-- Index for stage-based queries
-- Optimizes: Pipeline stage filtering in dashboard views
CREATE INDEX IF NOT EXISTS idx_companies_stage 
ON companies(workspace_id, stage)
WHERE passed_at IS NULL AND archived_at IS NULL;

-- Index for verdict filtering
-- Optimizes: Verdict filter queries (proceed/park/pass)
CREATE INDEX IF NOT EXISTS idx_companies_verdict 
ON companies(workspace_id, verdict)
WHERE passed_at IS NULL AND archived_at IS NULL;
