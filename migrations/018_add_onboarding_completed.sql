-- ============================================
-- Migration: Add Onboarding Completed Flag
-- Date: 2024
-- Description: Add onboarding_completed column to profiles table
-- ============================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed 
ON profiles(id, onboarding_completed)
WHERE onboarding_completed = FALSE;
