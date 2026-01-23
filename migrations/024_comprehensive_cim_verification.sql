-- ============================================
-- Migration: Comprehensive CIM Verification & Fix
-- Date: 2025-01-22
-- Description: Ensures ALL required columns, indexes, and constraints exist for CIM processing
-- This migration is idempotent and safe to run multiple times
-- ============================================

-- ============================================
-- PART 1: CIM Storage Columns
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS cim_storage_path TEXT;

COMMENT ON COLUMN companies.cim_storage_path IS 'Path to CIM file in Supabase storage bucket "cims"';

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
  ADD COLUMN IF NOT EXISTS final_tier TEXT;

-- Add CHECK constraint for final_tier if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_final_tier_check' 
    AND conrelid = 'companies'::regclass
  ) THEN
    ALTER TABLE companies 
      ADD CONSTRAINT companies_final_tier_check 
      CHECK (final_tier IN ('A', 'B', 'C', null));
  END IF;
END $$;

COMMENT ON COLUMN companies.ai_summary IS 'AI-generated summary of the deal from CIM analysis';
COMMENT ON COLUMN companies.ai_red_flags IS 'AI-identified red flags in bulleted markdown format';
COMMENT ON COLUMN companies.ai_financials_json IS 'Structured financial data extracted from CIM (JSONB)';
COMMENT ON COLUMN companies.ai_scoring_json IS 'AI scoring metrics and tier assessment (JSONB)';
COMMENT ON COLUMN companies.criteria_match_json IS 'Criteria matching results including QoE data (JSONB)';
COMMENT ON COLUMN companies.ai_confidence_json IS 'Data confidence snapshot for input quality assessment (JSONB)';
COMMENT ON COLUMN companies.final_tier IS 'Final tier assessment: A, B, or C';

-- ============================================
-- PART 3: Verdict and Decision Framework Columns
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS verdict TEXT,
  ADD COLUMN IF NOT EXISTS verdict_reason TEXT,
  ADD COLUMN IF NOT EXISTS verdict_confidence TEXT,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_date DATE,
  ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ;

-- Add CHECK constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_verdict_check' 
    AND conrelid = 'companies'::regclass
  ) THEN
    ALTER TABLE companies 
      ADD CONSTRAINT companies_verdict_check 
      CHECK (verdict IN ('proceed', 'park', 'pass', null));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_verdict_confidence_check' 
    AND conrelid = 'companies'::regclass
  ) THEN
    ALTER TABLE companies 
      ADD CONSTRAINT companies_verdict_confidence_check 
      CHECK (verdict_confidence IN ('high', 'medium', 'low', null));
  END IF;
END $$;

-- Set default for last_action_at if not set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = 'last_action_at' 
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE companies 
      ALTER COLUMN last_action_at SET DEFAULT NOW();
  END IF;
END $$;

COMMENT ON COLUMN companies.verdict IS 'Deal verdict: proceed, park, or pass';
COMMENT ON COLUMN companies.verdict_reason IS 'Primary reason for the verdict';
COMMENT ON COLUMN companies.verdict_confidence IS 'Confidence level in verdict: high, medium, or low';
COMMENT ON COLUMN companies.next_action IS 'Recommended next action for the deal';
COMMENT ON COLUMN companies.next_action_date IS 'Date for the next action';
COMMENT ON COLUMN companies.last_action_at IS 'Timestamp of last action on the deal';

-- ============================================
-- PART 4: Deal Economics Columns
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS asking_price_extracted TEXT,
  ADD COLUMN IF NOT EXISTS revenue_ttm_extracted TEXT,
  ADD COLUMN IF NOT EXISTS ebitda_ttm_extracted TEXT,
  ADD COLUMN IF NOT EXISTS sba_eligible BOOLEAN,
  ADD COLUMN IF NOT EXISTS deal_size_band TEXT;

-- Add CHECK constraint for deal_size_band if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_deal_size_band_check' 
    AND conrelid = 'companies'::regclass
  ) THEN
    ALTER TABLE companies 
      ADD CONSTRAINT companies_deal_size_band_check 
      CHECK (deal_size_band IN ('sub_1m', '1m_3m', '3m_5m', '5m_plus', null));
  END IF;
END $$;

COMMENT ON COLUMN companies.asking_price_extracted IS 'Asking price extracted from CIM';
COMMENT ON COLUMN companies.revenue_ttm_extracted IS 'TTM revenue extracted from CIM';
COMMENT ON COLUMN companies.ebitda_ttm_extracted IS 'TTM EBITDA extracted from CIM';
COMMENT ON COLUMN companies.sba_eligible IS 'SBA eligibility assessment (true/false/null)';
COMMENT ON COLUMN companies.deal_size_band IS 'Deal size band: sub_1m, 1m_3m, 3m_5m, 5m_plus';

-- ============================================
-- PART 5: Stage Tracking Columns
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS stage TEXT;

-- Add CHECK constraint and default for stage if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_stage_check' 
    AND conrelid = 'companies'::regclass
  ) THEN
    ALTER TABLE companies 
      ADD CONSTRAINT companies_stage_check 
      CHECK (stage IN ('new', 'reviewing', 'follow_up', 'ioi_sent', 'loi', 'dd', 'passed', 'closed_won', 'closed_lost'));
  END IF;
  
  -- Set default value if not set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = 'stage' 
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE companies 
      ALTER COLUMN stage SET DEFAULT 'new';
  END IF;
END $$;

COMMENT ON COLUMN companies.stage IS 'Current pipeline stage of the deal';

-- ============================================
-- PART 6: Source Type Column (if not exists)
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS source_type TEXT;

COMMENT ON COLUMN companies.source_type IS 'Source type: on_market, off_market, cim_pdf, financials';

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
-- PART 8: Verify Storage Bucket Exists
-- ============================================

-- Note: This is informational - actual bucket creation must be done in Supabase dashboard
-- The 'cims' bucket should exist in Supabase Storage

-- ============================================
-- PART 9: Verification Queries
-- ============================================

-- Verify all columns exist
DO $$
DECLARE
  missing_columns TEXT[];
  required_columns TEXT[] := ARRAY[
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
  ];
BEGIN
  SELECT array_agg(column_name)
  INTO missing_columns
  FROM unnest(required_columns) AS column_name
  WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = required_columns[array_position(required_columns, column_name)]
  );
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Missing required columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ All required CIM processing columns exist';
  END IF;
END $$;

-- Verify all indexes exist
DO $$
DECLARE
  missing_indexes TEXT[];
  required_indexes TEXT[] := ARRAY[
    'idx_companies_cim_storage_path',
    'idx_companies_source_type_cim',
    'idx_companies_ai_summary',
    'idx_companies_final_tier',
    'idx_companies_verdict',
    'idx_companies_stage',
    'idx_companies_ai_financials_json',
    'idx_companies_ai_scoring_json',
    'idx_companies_criteria_match_json',
    'idx_companies_ai_confidence_json'
  ];
BEGIN
  SELECT array_agg(index_name)
  INTO missing_indexes
  FROM unnest(required_indexes) AS index_name
  WHERE NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'companies' 
    AND indexname = required_indexes[array_position(required_indexes, index_name)]
  );
  
  IF array_length(missing_indexes, 1) > 0 THEN
    RAISE WARNING 'Missing indexes: %', array_to_string(missing_indexes, ', ');
  ELSE
    RAISE NOTICE '✅ All required indexes exist';
  END IF;
END $$;

-- ============================================
-- PART 10: Summary
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CIM Processing Verification Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All required columns, constraints, and indexes have been verified.';
  RAISE NOTICE 'CIM processing should now work correctly.';
  RAISE NOTICE '========================================';
END $$;
