-- FIX: Update storage policies for cims bucket
-- Run this to fix the storage RLS policies

-- First, drop the existing test policies if they exist
DROP POLICY IF EXISTS "CIMs: Test - Allow all authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Test - Allow all authenticated uploads" ON storage.objects;

-- Create proper policies that allow users to upload to their own folder
-- Using the same pattern as Financials policies (which work correctly)
-- Policy 1: Allow INSERT (uploads) to user's own folder
CREATE POLICY "Users can upload CIMs to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'cims'::text) 
  AND ((name ~~ ((auth.uid())::text || '/%'::text)) OR (name = ((auth.uid())::text || '/'::text)))
);

-- Policy 2: Allow SELECT (reads) from user's own folder
CREATE POLICY "Users can read CIMs from their folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  (bucket_id = 'cims'::text) 
  AND ((name ~~ ((auth.uid())::text || '/%'::text)) OR (name = ((auth.uid())::text || '/'::text)))
);

-- Policy 3: Allow DELETE from user's own folder
CREATE POLICY "Users can delete CIMs from their folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  (bucket_id = 'cims'::text) 
  AND ((name ~~ ((auth.uid())::text || '/%'::text)) OR (name = ((auth.uid())::text || '/'::text)))
);

-- Policy 4: Allow UPDATE (if needed for overwriting files)
CREATE POLICY "Users can update CIMs in their folder"
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
