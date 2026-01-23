-- ============================================
-- Migration: Add Custom Searcher Display Name
-- Date: 2025
-- Description: Allow investors to set custom display names for searchers (per-investor preference)
-- ============================================

-- Add custom_display_name column to investor_searcher_links
-- This allows each investor to have their own custom name for each searcher
ALTER TABLE investor_searcher_links 
  ADD COLUMN IF NOT EXISTS custom_display_name TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN investor_searcher_links.custom_display_name IS 
  'Custom display name set by the investor for this searcher. Only affects this investor''s view.';
