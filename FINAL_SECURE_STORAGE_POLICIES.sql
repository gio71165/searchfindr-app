-- FINAL: Create secure but working storage policies for CIMs
-- Since the permissive policy worked, we know policies work - now make it secure

-- Drop the test policy
DROP POLICY IF EXISTS "CIMs: Allow authenticated uploads" ON storage.objects;

-- Create secure policy that checks bucket_id (this should work now)
CREATE POLICY "CIMs: Allow authenticated uploads"
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
  AND policyname = 'CIMs: Allow authenticated uploads';

-- Now check Financials bucket policies
SELECT 
    'Financials policies:' as check_type,
    policyname,
    cmd,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%Financial%'
ORDER BY policyname;
