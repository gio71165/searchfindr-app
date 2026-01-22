-- COMPLETE FIX: Storage bucket and policies for CIMs
-- This will ensure everything is set up correctly

-- Step 1: Check if bucket exists, create if it doesn't
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cims',
  'cims',
  false,  -- Private bucket
  52428800,  -- 50MB limit (adjust as needed)
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop old test policies
DROP POLICY IF EXISTS "CIMs: Test - Allow all authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Test - Allow all authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload CIMs to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read CIMs from their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete CIMs from their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update CIMs in their folder" ON storage.objects;

-- Step 3: Create correct policies (matching Financials pattern exactly)
CREATE POLICY "CIMs: Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'cims'::text) 
  AND ((name ~~ ((auth.uid())::text || '/%'::text)) OR (name = ((auth.uid())::text || '/'::text)))
);

CREATE POLICY "CIMs: Users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  (bucket_id = 'cims'::text) 
  AND ((name ~~ ((auth.uid())::text || '/%'::text)) OR (name = ((auth.uid())::text || '/'::text)))
);

CREATE POLICY "CIMs: Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  (bucket_id = 'cims'::text) 
  AND ((name ~~ ((auth.uid())::text || '/%'::text)) OR (name = ((auth.uid())::text || '/'::text)))
);

CREATE POLICY "CIMs: Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  (bucket_id = 'cims'::text) 
  AND ((name ~~ ((auth.uid())::text || '/%'::text)) OR (name = ((auth.uid())::text || '/'::text)))
)
WITH CHECK (
  (bucket_id = 'cims'::text) 
  AND ((name ~~ ((auth.uid())::text || '/%'::text)) OR (name = ((auth.uid())::text || '/'::text)))
);

-- Step 4: Verify everything
SELECT 'Bucket check:' as check_type, name, id, public 
FROM storage.buckets 
WHERE name = 'cims';

SELECT 'Policies check:' as check_type, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%CIM%'
ORDER BY policyname;
