-- ============================================
-- Migration: Auto-assign workspace_id to profiles
-- Date: 2024
-- Description: Automatically assign workspace_id to new users and fix existing NULL values
-- ============================================

-- ============================================
-- PART 1: Function to auto-assign workspace_id
-- ============================================

-- Create a function that automatically generates and assigns a workspace_id
-- when a profile is created without one
CREATE OR REPLACE FUNCTION assign_workspace_id_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If workspace_id is NULL, generate a new UUID for it
  -- This creates a new workspace for each user automatically
  IF NEW.workspace_id IS NULL THEN
    NEW.workspace_id := gen_random_uuid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 2: Create trigger for new profiles
-- ============================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_assign_workspace_id ON profiles;

-- Create trigger that runs BEFORE INSERT
CREATE TRIGGER trigger_assign_workspace_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_workspace_id_to_profile();

-- ============================================
-- PART 3: Fix existing profiles with NULL workspace_id
-- ============================================

-- Update all existing profiles that have NULL workspace_id
-- Each user gets their own workspace_id
UPDATE profiles
SET workspace_id = gen_random_uuid()
WHERE workspace_id IS NULL;

-- ============================================
-- PART 4: Make workspace_id NOT NULL (optional but recommended)
-- ============================================

-- First, ensure all existing rows have workspace_id (we just did this above)
-- Then make the column NOT NULL to prevent future issues
ALTER TABLE profiles
  ALTER COLUMN workspace_id SET NOT NULL;

