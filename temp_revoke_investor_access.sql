-- ============================================
-- TEMPORARY SCRIPT: Revoke Investor Dashboard Access
-- Run this to remove investor role and revert to searcher
-- ============================================
-- 
-- INSTRUCTIONS:
-- Replace 'YOUR_EMAIL@example.com' with your actual email address
-- Or replace the user_id UUID with your actual user ID
-- ============================================

-- Option 1: Revert by email (recommended)
UPDATE profiles
SET role = 'searcher'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'
);

-- Option 2: Revert by user ID (if you know your UUID)
-- UPDATE profiles
-- SET role = 'searcher'
-- WHERE id = 'YOUR_USER_ID_HERE';

-- Verify the update
SELECT p.id, u.email, p.role 
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'YOUR_EMAIL@example.com';
