-- Verify current CIMs storage policies and ensure they're correct

-- 1. Check what policies exist now
SELECT 
    policyname,
    cmd,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (policyname LIKE '%CIM%' OR policyname LIKE '%cim%')
ORDER BY policyname;

-- 2. If the minimal policies aren't there, recreate them
-- Drop any existing CIMs policies
DROP POLICY IF EXISTS "CIMs: Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Test simple upload" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Allow all authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Allow all authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Allow all authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Users can read own files" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Users can update own files" ON storage.objects;

-- 3. Create the minimal working policies again
CREATE POLICY "CIMs: Allow all authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cims'::text);

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

-- 4. Verify they were created
SELECT 
    policyname,
    cmd,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%CIM%'
ORDER BY policyname;
