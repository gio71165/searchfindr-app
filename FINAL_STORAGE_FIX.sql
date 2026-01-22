-- FINAL FIX: Update CIMs storage policy to also check owner column
-- Supabase Storage might be setting owner automatically, so we need to account for that

-- Drop and recreate the INSERT policy with owner check
DROP POLICY IF EXISTS "CIMs: Users can upload to own folder" ON storage.objects;

-- Create new policy that also checks owner (matching how Supabase Storage works)
CREATE POLICY "CIMs: Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'cims'::text) 
  AND (
    (name ~~ ((auth.uid())::text || '/%'::text)) 
    OR (name = ((auth.uid())::text || '/'::text))
  )
  AND (owner = auth.uid() OR owner IS NULL)
);

-- Verify the policy was created
SELECT 
    policyname,
    cmd,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname = 'CIMs: Users can upload to own folder';
