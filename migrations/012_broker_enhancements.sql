-- ============================================
-- Migration: Broker CRM Enhancements
-- Date: 2024
-- Description: Add performance metrics and interaction tracking to brokers table
-- ============================================

-- ============================================
-- PART 1: Add performance metrics to brokers table
-- ============================================

ALTER TABLE brokers 
  ADD COLUMN IF NOT EXISTS deals_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deals_proceeded INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deals_won INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_deal_quality DECIMAL(3,2), -- 0.00 to 5.00
  ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}', -- e.g., ['healthcare', 'midwest']
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- ============================================
-- PART 2: Create broker_interactions table
-- ============================================

CREATE TABLE IF NOT EXISTS broker_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'email', 'phone', 'meeting', 'deal_received', 'feedback', 'other'
  )),
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 3: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_broker_interactions_broker ON broker_interactions(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_interactions_workspace ON broker_interactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_broker_interactions_date ON broker_interactions(interaction_date DESC);

-- ============================================
-- PART 4: Enable RLS
-- ============================================

ALTER TABLE broker_interactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 5: RLS Policies for broker_interactions
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their workspace's broker interactions" ON broker_interactions;
DROP POLICY IF EXISTS "Users can manage their workspace's broker interactions" ON broker_interactions;

-- View policy
CREATE POLICY "Users can view their workspace's broker interactions"
  ON broker_interactions FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
  ));

-- Manage policy (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage their workspace's broker interactions"
  ON broker_interactions FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
  ));

