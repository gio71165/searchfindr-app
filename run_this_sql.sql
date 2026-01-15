-- ============================================
-- Migration: Add Deal State Tracking
-- Date: 2024
-- Description: Add verdicts, stages, actions, and activity logging to companies table
-- ============================================

-- ============================================
-- PART 1: Add columns to companies table
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS verdict TEXT CHECK (verdict IN ('proceed', 'park', 'pass', null)),
  ADD COLUMN IF NOT EXISTS verdict_reason TEXT,
  ADD COLUMN IF NOT EXISTS verdict_confidence TEXT CHECK (verdict_confidence IN ('high', 'medium', 'low', null)),
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_date DATE,
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'reviewing', 'follow_up', 'ioi_sent', 'loi', 'dd', 'passed', 'closed_won', 'closed_lost')),
  ADD COLUMN IF NOT EXISTS asking_price_extracted TEXT,
  ADD COLUMN IF NOT EXISTS revenue_ttm_extracted TEXT,
  ADD COLUMN IF NOT EXISTS ebitda_ttm_extracted TEXT,
  ADD COLUMN IF NOT EXISTS sba_eligible BOOLEAN,
  ADD COLUMN IF NOT EXISTS deal_size_band TEXT CHECK (deal_size_band IN ('sub_1m', '1m_3m', '3m_5m', '5m_plus', null)),
  ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS pass_reason TEXT,
  ADD COLUMN IF NOT EXISTS pass_notes TEXT,
  ADD COLUMN IF NOT EXISTS passed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;

-- ============================================
-- PART 2: Create activity log table
-- ============================================

CREATE TABLE IF NOT EXISTS deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  deal_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL, 
  -- Types: 'stage_change', 'verdict_set', 'note', 'ioi_sent', 'call_scheduled', 'cim_analyzed', 'passed'
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_deal ON deal_activities(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_workspace ON deal_activities(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_stage ON companies(workspace_id, stage);
CREATE INDEX IF NOT EXISTS idx_companies_verdict ON companies(workspace_id, verdict);
CREATE INDEX IF NOT EXISTS idx_companies_next_action_date ON companies(next_action_date) WHERE next_action_date IS NOT NULL;

-- ============================================
-- PART 3: Auto-log stage changes
-- ============================================

CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage) THEN
    INSERT INTO deal_activities (workspace_id, deal_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.workspace_id,
      NEW.id,
      auth.uid(),
      'stage_change',
      'Changed stage from ' || COALESCE(OLD.stage, 'none') || ' to ' || NEW.stage,
      jsonb_build_object('old_stage', OLD.stage, 'new_stage', NEW.stage)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS stage_change_trigger ON companies;
CREATE TRIGGER stage_change_trigger
AFTER UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION log_stage_change();

-- ============================================
-- PART 4: RLS Policies for deal_activities
-- Simplified: Only checks workspace_id matches (no workspace_members dependency)
-- ============================================

ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view activities in their workspace" ON deal_activities;
DROP POLICY IF EXISTS "Users can insert activities in their workspace" ON deal_activities;

-- Simple policy: users can only see/insert activities for deals in their workspace
-- This assumes the companies table already has RLS that restricts by workspace_id
CREATE POLICY "Users can view activities in their workspace"
ON deal_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = deal_activities.deal_id 
    AND companies.workspace_id = deal_activities.workspace_id
  )
);

CREATE POLICY "Users can insert activities in their workspace"
ON deal_activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = deal_activities.deal_id 
    AND companies.workspace_id = deal_activities.workspace_id
  )
);
