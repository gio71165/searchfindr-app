-- ============================================
-- Migration: Data Capture Agent – expand training_data
-- Description: verdict_type, searcher_input_text, searcher_rating, context_metadata, financial_delta for all verdicts (pass, proceed, park).
-- ============================================

-- Allow pass_reason_sentence to be null for proceed/park (searcher_input_text is canonical)
ALTER TABLE training_data
  ALTER COLUMN pass_reason_sentence DROP NOT NULL;

-- New columns (searcher_input_text is the canonical 1-sentence reason)
ALTER TABLE training_data
  ADD COLUMN IF NOT EXISTS verdict_type TEXT CHECK (verdict_type IN ('pass', 'proceed', 'park'));

ALTER TABLE training_data
  ADD COLUMN IF NOT EXISTS searcher_input_text TEXT;

ALTER TABLE training_data
  ADD COLUMN IF NOT EXISTS searcher_rating INT CHECK (searcher_rating >= 1 AND searcher_rating <= 10);

ALTER TABLE training_data
  ADD COLUMN IF NOT EXISTS context_metadata JSONB DEFAULT '{}';

ALTER TABLE training_data
  ADD COLUMN IF NOT EXISTS financial_delta JSONB DEFAULT '{}';

-- Backfill verdict_type for existing rows (all were pass)
UPDATE training_data SET verdict_type = 'pass' WHERE verdict_type IS NULL;

-- Backfill searcher_input_text from pass_reason_sentence where available
UPDATE training_data SET searcher_input_text = pass_reason_sentence WHERE searcher_input_text IS NULL AND pass_reason_sentence IS NOT NULL;

COMMENT ON COLUMN training_data.verdict_type IS 'pass, proceed, or park';
COMMENT ON COLUMN training_data.searcher_input_text IS '1-sentence reason/explanation from searcher';
COMMENT ON COLUMN training_data.searcher_rating IS 'Gut check confidence 1-10';
COMMENT ON COLUMN training_data.context_metadata IS 'searcher_thesis, session_duration_seconds, broker_name';
COMMENT ON COLUMN training_data.financial_delta IS 'marketed_ebitda vs adjusted_ebitda (and similar)';
