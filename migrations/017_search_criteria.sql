-- ============================================
-- Migration: Search Criteria
-- Date: 2024
-- Description: Allow users to save custom search criteria for filtering deals
-- ============================================

-- ============================================
-- PART 1: Create search_criteria table
-- ============================================

CREATE TABLE IF NOT EXISTS search_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL, -- e.g., "My Search Thesis"
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Geography
  states TEXT[], -- ['TX', 'CA', 'FL']
  exclude_states TEXT[],
  max_distance_from_home INTEGER, -- miles
  
  -- Financials
  revenue_min DECIMAL(15,2),
  revenue_max DECIMAL(15,2),
  ebitda_min DECIMAL(15,2),
  ebitda_max DECIMAL(15,2),
  margin_min DECIMAL(5,2), -- percentage
  
  -- Deal
  asking_price_max DECIMAL(15,2),
  multiple_max DECIMAL(5,2),
  sba_eligible_only BOOLEAN DEFAULT false,
  
  -- Business
  industries TEXT[], -- ['healthcare', 'manufacturing']
  exclude_industries TEXT[],
  b2b_only BOOLEAN DEFAULT false,
  recurring_revenue_min DECIMAL(5,2), -- percentage
  customer_concentration_max DECIMAL(5,2), -- percentage
  
  -- Owner
  owner_willing_to_stay BOOLEAN,
  max_owner_dependence TEXT CHECK (max_owner_dependence IN ('low', 'medium', 'high')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 2: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_search_criteria_workspace ON search_criteria(workspace_id);
CREATE INDEX IF NOT EXISTS idx_search_criteria_user ON search_criteria(user_id);
CREATE INDEX IF NOT EXISTS idx_search_criteria_active ON search_criteria(user_id, is_active) WHERE is_active = true;

-- ============================================
-- PART 3: Enable RLS
-- ============================================

ALTER TABLE search_criteria ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 4: RLS Policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own search criteria" ON search_criteria;
DROP POLICY IF EXISTS "Users can manage their own search criteria" ON search_criteria;

-- View policy
CREATE POLICY "Users can view their own search criteria"
  ON search_criteria FOR SELECT
  USING (user_id = auth.uid() AND workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
  ));

-- Manage policy (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage their own search criteria"
  ON search_criteria FOR ALL
  USING (user_id = auth.uid() AND workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================
-- PART 5: Create updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_search_criteria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_search_criteria_updated_at ON search_criteria;
CREATE TRIGGER update_search_criteria_updated_at
  BEFORE UPDATE ON search_criteria
  FOR EACH ROW
  EXECUTE FUNCTION update_search_criteria_updated_at();

