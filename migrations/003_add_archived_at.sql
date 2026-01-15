-- ============================================
-- Migration: Add Archive Support for Deals
-- Date: 2024
-- Description: Add archived_at column to companies table for soft delete functionality
-- ============================================

-- Add archived_at timestamp column (nullable)
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for filtering archived deals
CREATE INDEX IF NOT EXISTS idx_companies_archived_at ON companies(workspace_id, archived_at) WHERE archived_at IS NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after executing the migration to verify:
--
-- 1. Check column was added:
--    SELECT column_name, data_type, is_nullable 
--    FROM information_schema.columns 
--    WHERE table_name = 'companies' 
--    AND column_name = 'archived_at';
--
-- 2. Check index was created:
--    SELECT indexname, indexdef 
--    FROM pg_indexes 
--    WHERE tablename = 'companies' 
--    AND indexname = 'idx_companies_archived_at';
