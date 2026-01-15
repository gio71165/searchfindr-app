-- Add verdict and related columns to companies table
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS verdict TEXT CHECK (verdict IN ('proceed', 'park', 'pass', null)),
  ADD COLUMN IF NOT EXISTS verdict_reason TEXT,
  ADD COLUMN IF NOT EXISTS verdict_confidence TEXT CHECK (verdict_confidence IN ('high', 'medium', 'low', null)),
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_date DATE,
  ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ DEFAULT NOW();
