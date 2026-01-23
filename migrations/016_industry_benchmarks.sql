-- ============================================
-- Migration: Industry Benchmarks
-- Date: 2024
-- Description: Create database of industry benchmarks for contextualizing deal metrics
-- ============================================

-- ============================================
-- PART 1: Create industry_benchmarks table
-- ============================================

CREATE TABLE IF NOT EXISTS industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL UNIQUE,
  naics_code TEXT,
  
  -- Revenue benchmarks (in dollars)
  revenue_p25 DECIMAL(15,2),
  revenue_median DECIMAL(15,2),
  revenue_p75 DECIMAL(15,2),
  
  -- EBITDA margin benchmarks (as percentage, e.g., 18.5 for 18.5%)
  ebitda_margin_p25 DECIMAL(5,2),
  ebitda_margin_median DECIMAL(5,2),
  ebitda_margin_p75 DECIMAL(5,2),
  
  -- Valuation multiple benchmarks (e.g., 4.5 for 4.5x EBITDA)
  valuation_multiple_p25 DECIMAL(5,2),
  valuation_multiple_median DECIMAL(5,2),
  valuation_multiple_p75 DECIMAL(5,2),
  
  -- Deal characteristics
  typical_deal_size_min DECIMAL(15,2),
  typical_deal_size_max DECIMAL(15,2),
  sba_commonality DECIMAL(5,2), -- % of deals that use SBA (0-100)
  
  -- Qualitative factors
  key_risks TEXT[],
  key_value_drivers TEXT[],
  
  -- Metadata
  data_source TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 2: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_benchmarks_industry ON industry_benchmarks(industry);
CREATE INDEX IF NOT EXISTS idx_benchmarks_naics ON industry_benchmarks(naics_code) WHERE naics_code IS NOT NULL;

-- ============================================
-- PART 3: Enable RLS (read-only for all authenticated users)
-- ============================================

ALTER TABLE industry_benchmarks ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view benchmarks
CREATE POLICY "Authenticated users can view industry benchmarks"
  ON industry_benchmarks FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Only admins can manage benchmarks
CREATE POLICY "Admins can manage industry benchmarks"
  ON industry_benchmarks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_admin = true OR role = 'admin')
    )
  );

