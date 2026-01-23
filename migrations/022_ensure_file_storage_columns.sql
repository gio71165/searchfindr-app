-- ============================================
-- Migration: Ensure File Storage Columns
-- Date: 2025-01-22
-- Description: Ensure all required columns exist for CIM and Financials file storage
-- ============================================

-- Add CIM storage path column if it doesn't exist
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS cim_storage_path TEXT;

-- Add Financials storage columns if they don't exist
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS financials_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS financials_filename TEXT,
  ADD COLUMN IF NOT EXISTS financials_mime TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_cim_storage_path 
  ON companies(cim_storage_path) 
  WHERE cim_storage_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_financials_storage_path 
  ON companies(financials_storage_path) 
  WHERE financials_storage_path IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN companies.cim_storage_path IS 'Path to CIM file in Supabase storage bucket "cims"';
COMMENT ON COLUMN companies.financials_storage_path IS 'Path to financials file in Supabase storage bucket "financials"';
COMMENT ON COLUMN companies.financials_filename IS 'Original filename of the uploaded financials file';
COMMENT ON COLUMN companies.financials_mime IS 'MIME type of the uploaded financials file';
