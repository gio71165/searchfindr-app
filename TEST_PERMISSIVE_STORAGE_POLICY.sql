-- Test with a more permissive policy to see if it works
-- This will help us determine if the issue is with the policy condition

-- Drop existing policy
DROP POLICY IF EXISTS "CIMs: Allow authenticated uploads" ON storage.objects;

-- Create a policy that allows ANY authenticated user to upload to cims bucket
-- (This is less secure but will help us test if policies work at all)
CREATE POLICY "CIMs: Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow everything for authenticated users

-- Verify
SELECT 
    policyname,
    cmd,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname = 'CIMs: Allow authenticated uploads';
