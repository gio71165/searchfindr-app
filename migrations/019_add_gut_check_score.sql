-- ============================================
-- Migration: Add Gut Check Score
-- Date: 2024
-- Description: Add gut_check_score column to companies table for emotional validation tracking
-- ============================================

-- Add gut_check_score column (1-10 scale)
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS gut_check_score INTEGER CHECK (gut_check_score >= 1 AND gut_check_score <= 10);

-- Create index for analytics queries (correlation between gut check and verdict)
CREATE INDEX IF NOT EXISTS idx_companies_gut_check_verdict 
ON companies(workspace_id, gut_check_score, verdict) 
WHERE gut_check_score IS NOT NULL;

