-- Simple test: Check if the policy condition works
-- Run this while logged in as the user trying to upload

-- 1. Check current user ID
SELECT 
    auth.uid() as current_user_id,
    auth.uid()::text as current_user_id_text;

-- 2. Test if the policy pattern would match
SELECT 
    '3025715c-5ff8-425e-9735-0206857e499b/1769044816374-qpivszi04r.docx' as test_file_path,
    ('3025715c-5ff8-425e-9735-0206857e499b/1769044816374-qpivszi04r.docx' ~~ ('3025715c-5ff8-425e-9735-0206857e499b' || '/%')) as pattern_should_match;

-- 3. Check the exact policy WITH CHECK expression
SELECT 
    policyname,
    cmd,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname = 'CIMs: Users can upload to own folder';

-- 4. List all storage policies for cims (check the with_check expressions)
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (policyname LIKE '%CIM%' OR policyname LIKE '%cim%')
ORDER BY policyname;
