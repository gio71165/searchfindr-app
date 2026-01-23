-- ============================================
-- Check User Roles and Relationships
-- ============================================
-- This script shows all users, their roles, and investor-searcher links
-- ============================================

-- 1. Show all users with their roles and admin status
SELECT 
  u.id,
  u.email,
  p.role,
  p.is_admin,
  p.workspace_id,
  u.created_at as user_created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.email;

-- 2. Show investor-searcher relationships
SELECT 
  isl.id as link_id,
  inv.email as investor_email,
  inv.id as investor_id,
  searcher.email as searcher_email,
  searcher.id as searcher_id,
  isl.workspace_id,
  isl.access_level,
  isl.capital_committed,
  isl.created_at as linked_at
FROM investor_searcher_links isl
JOIN auth.users inv ON isl.investor_id = inv.id
JOIN auth.users searcher ON isl.searcher_id = searcher.id
ORDER BY inv.email, searcher.email;

-- 3. Count users by role
SELECT 
  COALESCE(p.role, 'no role set') as role,
  COUNT(*) as user_count
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
GROUP BY p.role
ORDER BY user_count DESC;

-- 4. Find your specific user (replace with your email)
-- SELECT 
--   u.id,
--   u.email,
--   p.role,
--   p.is_admin,
--   p.workspace_id
-- FROM auth.users u
-- LEFT JOIN profiles p ON u.id = p.id
-- WHERE u.email = 'YOUR_EMAIL@example.com';
