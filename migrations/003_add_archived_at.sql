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

