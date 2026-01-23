-- ============================================
-- Migration: Workspaces RLS Policies
-- Date: 2024
-- Description: Add RLS policies for workspaces table to allow users to update their workspace settings
-- ============================================

-- IMPORTANT: Before running this, check your workspaces table structure:
-- Run this query in Supabase SQL Editor:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'workspaces' 
-- ORDER BY ordinal_position;
--
-- Then update the column references below to match your actual table structure.
-- Common patterns:
-- - If workspaces has 'id' column: use workspaces.id
-- - If workspaces uses 'workspace_id' as PK: use workspaces.workspace_id  
-- - If workspaces PK matches profiles.workspace_id values: match on that

-- Enable RLS on workspaces table (if not already enabled)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their workspace
-- This allows users to read their workspace data
DROP POLICY IF EXISTS "Users can view their workspace" ON workspaces;

-- Policy: Users can update their workspace  
-- This allows users to update workspace settings like all_investors_us_citizens
DROP POLICY IF EXISTS "Users can update their workspace" ON workspaces;

-- NOTE: The policies below assume workspaces table has a primary key column
-- that contains the same UUID values as profiles.workspace_id
-- 
-- If your workspaces table structure is different, you'll need to adjust the USING clauses.
-- For example, if workspaces uses 'workspace_id' as the PK instead of 'id', change:
--   workspaces.id -> workspaces.workspace_id
--
-- Or if the PK column has a different name, replace 'id' with that column name.

-- Try with 'id' column (most common)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'id') THEN
    EXECUTE '
    CREATE POLICY "Users can view their workspace"
    ON workspaces FOR SELECT
    USING (
      id IN (
        SELECT workspace_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    );
    
    CREATE POLICY "Users can update their workspace"
    ON workspaces FOR UPDATE
    USING (
      id IN (
        SELECT workspace_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
    WITH CHECK (
      id IN (
        SELECT workspace_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    );';
  END IF;
END $$;

-- If 'id' doesn't exist, try with 'workspace_id' as PK
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'workspace_id') THEN
    EXECUTE '
    CREATE POLICY "Users can view their workspace"
    ON workspaces FOR SELECT
    USING (
      workspace_id IN (
        SELECT workspace_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    );
    
    CREATE POLICY "Users can update their workspace"
    ON workspaces FOR UPDATE
    USING (
      workspace_id IN (
        SELECT workspace_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
    WITH CHECK (
      workspace_id IN (
        SELECT workspace_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    );';
  END IF;
END $$;
