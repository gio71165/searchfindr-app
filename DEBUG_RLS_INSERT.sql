-- DEBUG: Check why INSERT is still failing
-- Run this while logged in as the user who can't upload

-- Step 1: Check current user and their workspace_id
SELECT 
    auth.uid() as current_user_id,
    (SELECT workspace_id FROM profiles WHERE id = auth.uid()) as user_profile_workspace_id;

-- Step 2: Check what workspace_id the app is trying to insert
-- (We need to see what value is being sent from the frontend)
-- The app code shows it uses workspaceId from useAuth() hook

-- Step 3: Test if the RLS policy would allow an INSERT
-- Simulate what happens when inserting a company
SELECT 
    'Testing RLS policy' as test_name,
    auth.uid() as user_id,
    (SELECT workspace_id FROM profiles WHERE id = auth.uid()) as profile_workspace_id,
    CASE 
        WHEN (SELECT workspace_id FROM profiles WHERE id = auth.uid()) IS NULL 
        THEN 'FAIL: User has no workspace_id in profile'
        ELSE 'OK: User has workspace_id'
    END as profile_check;

-- Step 4: Check the actual RLS policy WITH CHECK expression
-- This is what gets evaluated during INSERT
SELECT 
    pol.polname,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'companies';

-- Step 5: Check if there's a mismatch between what the frontend has and what the profile has
-- The frontend uses workspaceId from useAuth() hook which fetches from profiles table
-- If the profile was just updated, the frontend might have stale data

-- Solution: User needs to refresh the page or log out/in to get updated workspace_id
SELECT 
    'IMPORTANT: If you just ran the migration, refresh your browser page!' as note,
    auth.uid() as current_user_id,
    (SELECT workspace_id FROM profiles WHERE id = auth.uid()) as profile_workspace_id;
