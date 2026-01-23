-- Add composite index for archived_at queries
-- This optimizes queries that filter by workspace_id, archived_at, and created_at
-- Created to address performance audit findings

CREATE INDEX IF NOT EXISTS idx_companies_workspace_archived_created 
ON companies(workspace_id, archived_at, created_at DESC)
WHERE passed_at IS NULL;

-- Index for archived_at IS NULL queries (most common case)
CREATE INDEX IF NOT EXISTS idx_companies_workspace_not_archived 
ON companies(workspace_id, created_at DESC)
WHERE passed_at IS NULL AND archived_at IS NULL;
