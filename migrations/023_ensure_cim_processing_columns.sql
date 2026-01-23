-- ============================================
-- Migration: Ensure CIM Processing Columns
-- Date: 2025-01-22
-- Description: Ensures all required columns exist for CIM processing
-- This migration is idempotent and safe to run multiple times
-- ============================================

-- ============================================
-- PART 1: CIM Storage Columns
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS cim_storage_path TEXT;

-- ============================================
-- PART 2: AI Analysis Columns (JSONB for structured data)
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_red_flags TEXT,
  ADD COLUMN IF NOT EXISTS ai_financials_json JSONB,
  ADD COLUMN IF NOT EXISTS ai_scoring_json JSONB,
  ADD COLUMN IF NOT EXISTS criteria_match_json JSONB,
  ADD COLUMN IF NOT EXISTS ai_confidence_json JSONB,
  ADD COLUMN IF NOT EXISTS final_tier TEXT CHECK (final_tier IN ('A', 'B', 'C', null));

-- ============================================
-- PART 3: Verdict and Decision Framework Columns
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS verdict TEXT CHECK (verdict IN ('proceed', 'park', 'pass', null)),
  ADD COLUMN IF NOT EXISTS verdict_reason TEXT,
  ADD COLUMN IF NOT EXISTS verdict_confidence TEXT CHECK (verdict_confidence IN ('high', 'medium', 'low', null)),
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_date DATE,
  ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- PART 4: Deal Economics Columns
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS asking_price_extracted TEXT,
  ADD COLUMN IF NOT EXISTS revenue_ttm_extracted TEXT,
  ADD COLUMN IF NOT EXISTS ebitda_ttm_extracted TEXT,
  ADD COLUMN IF NOT EXISTS sba_eligible BOOLEAN,
  ADD COLUMN IF NOT EXISTS deal_size_band TEXT CHECK (deal_size_band IN ('sub_1m', '1m_3m', '3m_5m', '5m_plus', null));

-- ============================================
-- PART 5: Stage Tracking Columns
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'reviewing', 'follow_up', 'ioi_sent', 'loi', 'dd', 'passed', 'closed_won', 'closed_lost'));

-- ============================================
-- PART 6: Source Type Column (if not exists)
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS source_type TEXT;

-- ============================================
-- PART 7: Create Indexes for Performance
-- ============================================

-- Index for CIM storage path lookups
CREATE INDEX IF NOT EXISTS idx_companies_cim_storage_path 
  ON companies(cim_storage_path) 
  WHERE cim_storage_path IS NOT NULL;

-- Index for source type filtering (CIM deals)
CREATE INDEX IF NOT EXISTS idx_companies_source_type_cim 
  ON companies(source_type) 
  WHERE source_type = 'cim_pdf';

-- Index for AI analysis fields (for queries filtering by analysis status)
CREATE INDEX IF NOT EXISTS idx_companies_ai_summary 
  ON companies(workspace_id) 
  WHERE ai_summary IS NOT NULL;

-- Index for final_tier filtering
CREATE INDEX IF NOT EXISTS idx_companies_final_tier 
  ON companies(workspace_id, final_tier) 
  WHERE final_tier IS NOT NULL;

-- Index for verdict filtering
CREATE INDEX IF NOT EXISTS idx_companies_verdict 
  ON companies(workspace_id, verdict) 
  WHERE verdict IS NOT NULL;

-- Index for stage filtering
CREATE INDEX IF NOT EXISTS idx_companies_stage 
  ON companies(workspace_id, stage);

-- GIN index for JSONB columns (for efficient JSON queries)
CREATE INDEX IF NOT EXISTS idx_companies_ai_financials_json 
  ON companies USING GIN(ai_financials_json) 
  WHERE ai_financials_json IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_ai_scoring_json 
  ON companies USING GIN(ai_scoring_json) 
  WHERE ai_scoring_json IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_criteria_match_json 
  ON companies USING GIN(criteria_match_json) 
  WHERE criteria_match_json IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_ai_confidence_json 
  ON companies USING GIN(ai_confidence_json) 
  WHERE ai_confidence_json IS NOT NULL;

-- ============================================
-- PART 8: Add Comments for Documentation
-- ============================================

COMMENT ON COLUMN companies.cim_storage_path IS 'Path to CIM file in Supabase storage bucket "cims"';
COMMENT ON COLUMN companies.ai_summary IS 'AI-generated summary of the deal from CIM analysis';
COMMENT ON COLUMN companies.ai_red_flags IS 'AI-identified red flags in bulleted markdown format';
COMMENT ON COLUMN companies.ai_financials_json IS 'Structured financial data extracted from CIM (JSONB)';
COMMENT ON COLUMN companies.ai_scoring_json IS 'AI scoring metrics and tier assessment (JSONB)';
COMMENT ON COLUMN companies.criteria_match_json IS 'Criteria matching results including QoE data (JSONB)';
COMMENT ON COLUMN companies.ai_confidence_json IS 'Data confidence snapshot for input quality assessment (JSONB)';
COMMENT ON COLUMN companies.final_tier IS 'Final tier assessment: A, B, or C';
COMMENT ON COLUMN companies.verdict IS 'Deal verdict: proceed, park, or pass';
COMMENT ON COLUMN companies.verdict_confidence IS 'Confidence level in verdict: high, medium, or low';
COMMENT ON COLUMN companies.stage IS 'Current pipeline stage of the deal';

-- ============================================
-- PART 9: Verification Queries
-- ============================================

-- Verify all columns exist
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT array_agg(column_name)
  INTO missing_columns
  FROM (
    SELECT unnest(ARRAY[
      'cim_storage_path',
      'ai_summary',
      'ai_red_flags',
      'ai_financials_json',
      'ai_scoring_json',
      'criteria_match_json',
      'ai_confidence_json',
      'final_tier',
      'verdict',
      'verdict_reason',
      'verdict_confidence',
      'next_action',
      'next_action_date',
      'last_action_at',
      'asking_price_extracted',
      'revenue_ttm_extracted',
      'ebitda_ttm_extracted',
      'sba_eligible',
      'deal_size_band',
      'stage',
      'source_type'
    ]) AS column_name
  ) AS required
  WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = required.column_name
  );
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Missing required columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE 'All required CIM processing columns exist';
  END IF;
END $$;
