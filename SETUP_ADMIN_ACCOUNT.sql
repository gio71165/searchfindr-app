-- ============================================
-- QUICK SETUP: Make Your Account Admin
-- ============================================
-- 
-- STEP 1: First run migrations/004_admin_dashboard_setup.sql
-- STEP 2: Then run this file (replace YOUR_EMAIL with your actual email)
-- ============================================

-- Replace 'YOUR_EMAIL@example.com' with your actual login email address
UPDATE profiles
SET is_admin = TRUE
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'YOUR_EMAIL@example.com'
);

-- Verify it worked (should return 1 row with is_admin = true)
SELECT 
  p.id,
  u.email,
  p.is_admin,
  p.created_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'YOUR_EMAIL@example.com';
