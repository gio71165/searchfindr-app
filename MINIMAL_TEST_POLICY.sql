-- MINIMAL TEST: Create the simplest possible policy to see if ANY policy works
-- This will help us determine if the issue is with RLS itself or the policy conditions

-- Drop all CIMs policies first
DROP POLICY IF EXISTS "CIMs: Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Test simple upload" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Users can read own files" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Users can update own files" ON storage.objects;

-- Create the absolute simplest policy - allow all authenticated users to upload to cims bucket
CREATE POLICY "CIMs: Allow all authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cims'::text);

-- Also create simple read/delete policies
CREATE POLICY "CIMs: Allow all authenticated reads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'cims'::text);

CREATE POLICY "CIMs: Allow all authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'cims'::text);

-- Verify
SELECT 
    policyname,
    cmd,
    with_check as with_check_expression,
    qual as using_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%CIM%'
ORDER BY policyname;
