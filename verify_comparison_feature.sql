-- ============================================
-- Verification Query: Check Required Columns for Comparison Feature
-- ============================================
-- Run this to verify all required columns exist for the comparison feature
-- No changes needed if all columns exist

-- Check if all required columns exist in companies table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name IN (
    'id',
    'workspace_id',
    'company_name',
    'industry',
    'location_city',
    'location_state',
    'revenue_ttm_extracted',
    'ebitda_ttm_extracted',
    'final_tier',
    'created_at',
    'source_type',
    'archived_at',
    'ai_financials_json',
    'criteria_match_json'
  )
ORDER BY column_name;

-- Check if ai_financials_json is JSONB (required for storing financial_tables)
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name = 'ai_financials_json';

-- Check if archived_at index exists (for performance)
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'companies'
  AND indexname = 'idx_companies_archived_at';

-- ============================================
-- Expected Results:
-- ============================================
-- 1. All 14 columns should be listed
-- 2. ai_financials_json should be type 'jsonb' (or 'json')
-- 3. Index idx_companies_archived_at should exist
-- ============================================
