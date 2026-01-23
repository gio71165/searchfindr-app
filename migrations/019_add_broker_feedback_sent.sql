-- Add broker_feedback_sent field to companies table
-- This tracks whether broker feedback was sent when passing a deal

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS broker_feedback_sent BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN companies.broker_feedback_sent IS 'Indicates whether broker feedback was sent when this deal was passed';
