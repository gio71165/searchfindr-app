-- Add stage column to companies table
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'reviewing', 'follow_up', 'ioi_sent', 'loi', 'dd', 'passed', 'closed_won', 'closed_lost'));
