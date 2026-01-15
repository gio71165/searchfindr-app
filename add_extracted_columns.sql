-- Add extracted financial columns (if not already in migration)
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS asking_price_extracted TEXT,
  ADD COLUMN IF NOT EXISTS revenue_ttm_extracted TEXT,
  ADD COLUMN IF NOT EXISTS ebitda_ttm_extracted TEXT;
