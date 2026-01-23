-- ============================================
-- Migration: SBA Citizenship Compliance
-- Date: 2024
-- Description: Add SBA citizenship compliance fields to workspaces and investor_searcher_links
-- ============================================

-- Add compliance flag to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS all_investors_us_citizens BOOLEAN DEFAULT TRUE;

-- Add citizenship status to investor_searcher_links table
ALTER TABLE investor_searcher_links
ADD COLUMN IF NOT EXISTS investor_citizenship_status TEXT 
CHECK (investor_citizenship_status IN ('us_citizen', 'permanent_resident', 'non_resident'));

-- Create index for quick lookups of non-compliant workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_sba_compliance 
ON workspaces(all_investors_us_citizens)
WHERE all_investors_us_citizens = FALSE;
