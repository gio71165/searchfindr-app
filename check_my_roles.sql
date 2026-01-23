-- ============================================
-- Quick Check: Your User Roles
-- ============================================
-- Replace 'YOUR_EMAIL@example.com' with your actual email
-- ============================================

-- Check your user account and role
SELECT 
  u.id,
  u.email,
  p.role,
  p.is_admin,
  p.workspace_id,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'YOUR_EMAIL@example.com';

-- Check if you're linked as an investor to any searchers
SELECT 
  'You are an INVESTOR linked to these searchers:' as info,
  searcher.email as searcher_email,
  searcher.id as searcher_id,
  isl.access_level,
  isl.capital_committed,
  isl.created_at as linked_at
FROM investor_searcher_links isl
JOIN auth.users inv ON isl.investor_id = inv.id
JOIN auth.users searcher ON isl.searcher_id = searcher.id
WHERE inv.email = 'YOUR_EMAIL@example.com';

-- Check if you're linked as a searcher to any investors
SELECT 
  'You are a SEARCHER linked to these investors:' as info,
  inv.email as investor_email,
  inv.id as investor_id,
  isl.access_level,
  isl.capital_committed,
  isl.created_at as linked_at
FROM investor_searcher_links isl
JOIN auth.users inv ON isl.investor_id = inv.id
JOIN auth.users searcher ON isl.searcher_id = searcher.id
WHERE searcher.email = 'YOUR_EMAIL@example.com';
