-- ============================================
-- Migration: Add Onboarding Step Tracking
-- Date: 2024
-- Description: Add onboarding_step and onboarding_skipped columns to profiles table
-- ============================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step 
ON profiles(id, onboarding_step)
WHERE onboarding_completed = FALSE;

COMMENT ON COLUMN profiles.onboarding_step IS 'Current step in the interactive onboarding flow (0-based index)';
COMMENT ON COLUMN profiles.onboarding_skipped IS 'Whether the user has skipped the onboarding tutorial';
