-- FIX: Storage bucket RLS policies for cims bucket
-- The error is happening when uploading to storage, not the database

-- Step 1: Check current storage policies (if accessible via SQL)
-- Note: Storage policies are usually managed in Supabase Dashboard > Storage > Policies
-- But we can check if there are any via the storage.objects table

-- Step 2: The fix needs to be done in Supabase Dashboard:
-- 1. Go to Storage > cims bucket
-- 2. Click on "Policies" tab
-- 3. Create/update policies to allow authenticated users to upload

-- Here's the SQL equivalent (if you have access to storage schema):
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cims' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read files from their own folder
CREATE POLICY "Users can read from their own folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cims' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete files from their own folder
CREATE POLICY "Users can delete from their own folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cims' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- If the above doesn't work, try this simpler policy (less secure but works):
-- Allow all authenticated users to upload/read/delete in cims bucket
-- CREATE POLICY "Authenticated users can manage cims"
-- ON storage.objects
-- FOR ALL
-- TO authenticated
-- USING (bucket_id = 'cims')
-- WITH CHECK (bucket_id = 'cims');
