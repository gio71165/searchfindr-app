-- Migration: Fix profiles table RLS policies and add compliance columns
-- Ensures users can read/write their own compliance settings (sba_compliant, is_citizen_or_resident)

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if they exist) to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create correct SELECT policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Create correct UPDATE policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create correct INSERT policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Add compliance columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sba_compliant BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_citizen_or_resident BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN profiles.sba_compliant IS 'Whether the user is SBA compliant (for SBA loan eligibility)';
COMMENT ON COLUMN profiles.is_citizen_or_resident IS 'Whether the user is a US citizen or permanent resident';

-- Verify RLS is enabled (informational query - won't fail if already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'RLS was not enabled on profiles table - enabling now';
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
