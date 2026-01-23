-- ============================================
-- Migration: Deal Scoring Model
-- Date: 2024
-- Description: Add outcome tracking and score components for ML-based deal scoring
-- ============================================

-- ============================================
-- PART 1: Add outcome tracking columns
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS outcome TEXT 
    CHECK (outcome IN ('closed', 'lost', 'passed', 'active'));

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS outcome_date TIMESTAMPTZ;

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

-- ============================================
-- PART 2: Add score components storage
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS score_components JSONB;
-- Example structure:
-- {
--   "financialQuality": 0.85,
--   "revenueStability": 0.90,
--   "customerConcentration": 0.20,
--   "ownerDependence": 0.15,
--   "industryFit": 0.80,
--   "geographyFit": 0.75,
--   "sbaEligibility": 1.0,
--   "reasonableValuation": 0.70
-- }

-- ============================================
-- PART 3: Create model weights table for storing learned weights
-- ============================================

CREATE TABLE IF NOT EXISTS deal_scoring_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  -- If workspace_id is NULL, these are global/default weights
  
  weights JSONB NOT NULL,
  -- Structure matches the score components:
  -- {
  --   "financialQuality": 0.25,
  --   "revenueStability": 0.20,
  --   ...
  -- }
  
  version INTEGER DEFAULT 1,
  training_date TIMESTAMPTZ DEFAULT NOW(),
  training_sample_size INTEGER,
  performance_metrics JSONB,
  -- Example: { "accuracy": 0.75, "precision": 0.80, "recall": 0.70 }
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 4: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_outcome ON companies(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_outcome_date ON companies(outcome_date) WHERE outcome_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_score_components ON companies USING GIN(score_components) WHERE score_components IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scoring_weights_workspace ON deal_scoring_weights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scoring_weights_active ON deal_scoring_weights(is_active) WHERE is_active = true;

-- ============================================
-- PART 5: Enable RLS on deal_scoring_weights
-- ============================================

ALTER TABLE deal_scoring_weights ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view weights for their workspace or global weights
CREATE POLICY "Users can view scoring weights for their workspace"
  ON deal_scoring_weights FOR SELECT
  USING (
    workspace_id IS NULL OR 
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Only admins can update weights
CREATE POLICY "Admins can manage scoring weights"
  ON deal_scoring_weights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_admin = true OR role = 'admin')
    )
  );

