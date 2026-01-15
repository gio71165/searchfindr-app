-- ============================================
-- Minimal Migration: Add Pass Deal Columns
-- Only adds the ESSENTIAL columns needed for pass deal functionality
-- ============================================

-- Add columns needed for pass deal flow
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS pass_reason TEXT,
  ADD COLUMN IF NOT EXISTS pass_notes TEXT,
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'reviewing', 'follow_up', 'ioi_sent', 'loi', 'dd', 'passed', 'closed_won', 'closed_lost')),
  ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ DEFAULT NOW();

-- Note: If passed_at doesn't exist, you may need to add it:
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS passed_at TIMESTAMPTZ;
