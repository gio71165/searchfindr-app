-- TEST: Try a simpler policy first to see if it works
-- This will help us isolate the issue

-- Drop the current INSERT policy
DROP POLICY IF EXISTS "CIMs: Users can upload to own folder" ON storage.objects;

-- Create a very simple policy first (just to test if policies work at all)
CREATE POLICY "CIMs: Test simple upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cims'::text);

-- Verify
SELECT 
    policyname,
    cmd,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname = 'CIMs: Test simple upload';
