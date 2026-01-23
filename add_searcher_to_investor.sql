-- ============================================
-- Add Searcher to Investor Dashboard
-- ============================================
-- This script links a searcher account to an investor account
-- ============================================
-- 
-- INSTRUCTIONS:
-- 1. First, create a new account through the app UI (sign up page)
-- 2. Make sure that account has role = 'searcher' (default)
-- 3. Run this script to link the searcher to your investor account
-- ============================================

-- Step 1: Check your current user (investor) - replace with your email
SELECT 
  u.id as investor_id,
  u.email as investor_email,
  p.role as investor_role,
  p.workspace_id as investor_workspace_id
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'YOUR_INVESTOR_EMAIL@example.com';

-- Step 2: Check the searcher account - replace with searcher email
SELECT 
  u.id as searcher_id,
  u.email as searcher_email,
  p.role as searcher_role,
  p.workspace_id as searcher_workspace_id
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'SEARCHER_EMAIL@example.com';

-- Step 3: Ensure searcher has the correct role (should be 'searcher' by default)
-- UPDATE profiles
-- SET role = 'searcher'
-- WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'SEARCHER_EMAIL@example.com'
-- );

-- Step 4: Create the link between investor and searcher
-- Replace the UUIDs and workspace_id with actual values from Step 1 and Step 2
-- INSERT INTO investor_searcher_links (
--   investor_id,
--   searcher_id,
--   workspace_id,
--   access_level,
--   capital_committed
-- )
-- VALUES (
--   'INVESTOR_USER_ID_HERE',  -- From Step 1
--   'SEARCHER_USER_ID_HERE',  -- From Step 2
--   'WORKSPACE_ID_HERE',      -- Should match both investor and searcher workspace_id
--   'full',                    -- 'full' or 'summary'
--   NULL                       -- Optional: capital committed amount
-- )
-- ON CONFLICT (investor_id, searcher_id, workspace_id) 
-- DO NOTHING;

-- Step 5: Verify the link was created
-- SELECT 
--   isl.id,
--   inv.email as investor_email,
--   searcher.email as searcher_email,
--   isl.workspace_id,
--   isl.access_level,
--   isl.capital_committed,
--   isl.created_at
-- FROM investor_searcher_links isl
-- JOIN auth.users inv ON isl.investor_id = inv.id
-- JOIN auth.users searcher ON isl.searcher_id = searcher.id
-- WHERE inv.email = 'YOUR_INVESTOR_EMAIL@example.com'
--   AND searcher.email = 'SEARCHER_EMAIL@example.com';
