-- Fix document storage policies to require authentication (not public)
-- Documents are stored as: user_id/deal_id/filename
-- We need to ensure users can only access documents for deals in their workspace

-- 1. Drop the insecure public policies
DROP POLICY IF EXISTS "Users can delete documents in their workspace" ON storage.objects;
DROP POLICY IF EXISTS "Users can read documents in their workspace" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents in their workspace" ON storage.objects;

-- 2. Create secure authenticated-only policies for deal_documents bucket
-- Path structure: user_id/deal_id/filename
-- We check that the deal_id (second path segment) belongs to the user's workspace

-- INSERT: Users can upload documents (path must start with their user_id)
CREATE POLICY "Documents: Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal_documents'::text
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- SELECT: Users can read documents for deals in their workspace
-- Check that the deal_id (second path segment) exists in companies table with their workspace_id
CREATE POLICY "Documents: Users can read workspace documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal_documents'::text
  AND (
    -- User can read their own uploads
    (storage.foldername(name))[1] = (auth.uid())::text
    OR
    -- OR the deal belongs to their workspace (check via deal_documents table)
    EXISTS (
      SELECT 1 FROM deal_documents
      WHERE storage_path = name
      AND workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  )
);

-- DELETE: Users can delete documents in their workspace
CREATE POLICY "Documents: Users can delete workspace documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal_documents'::text
  AND (
    -- User can delete their own uploads
    (storage.foldername(name))[1] = (auth.uid())::text
    OR
    -- OR the deal belongs to their workspace
    EXISTS (
      SELECT 1 FROM deal_documents
      WHERE storage_path = name
      AND workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  )
);

-- 3. Verify the new policies
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
  AND policyname LIKE '%Document%'
ORDER BY policyname;
