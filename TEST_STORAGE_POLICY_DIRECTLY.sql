-- Test if we can directly check what the policy would evaluate to
-- This helps us understand why the policy is failing

-- Check if there are any RESTRICTIVE policies that might be blocking
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%CIM%'
ORDER BY permissive, policyname;

-- Also check if there are any policies on storage.buckets table
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'buckets'
ORDER BY policyname;
