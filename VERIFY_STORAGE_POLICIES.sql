-- Verify the CIMs storage policies were created correctly
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%CIM%' OR policyname LIKE '%cim%'
ORDER BY policyname;

-- Also check if the bucket exists
SELECT name, id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name = 'cims';
