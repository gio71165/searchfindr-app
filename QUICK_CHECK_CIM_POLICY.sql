-- ============================================
-- QUICK CHECK: Do we have a working CIM upload policy?
-- ============================================

-- Check if we have ANY INSERT policy for cims bucket
SELECT 
  'CIM Upload Policy Check' as info,
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'INSERT' THEN '✓ Has INSERT policy'
    ELSE 'Other policy'
  END as status
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    policyname LIKE '%CIM%' 
    OR policyname LIKE '%cim%'
    OR policyname LIKE '%Test%'
  )
ORDER BY cmd, policyname;

-- If no results, we need to create a policy!
-- Run TEST_CIM_UPLOAD_PERMISSIVE.sql if you see no INSERT policy
