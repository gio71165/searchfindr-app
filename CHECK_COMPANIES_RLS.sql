-- Check the RLS policy on companies table for INSERT
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'companies'
  AND cmd = 'INSERT' OR cmd = 'ALL'
ORDER BY policyname;
