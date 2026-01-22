-- TEST: Verify the policy would match the actual file path
-- This will help us see if the policy condition is working

-- Test the policy condition with the actual user ID and file path
SELECT 
    '3025715c-5ff8-425e-9735-0206857e499b' as user_id,
    '3025715c-5ff8-425e-9735-0206857e499b/1769044816374-qpivszi04r.docx' as file_path,
    ('3025715c-5ff8-425e-9735-0206857e499b/1769044816374-qpivszi04r.docx' ~~ ('3025715c-5ff8-425e-9735-0206857e499b' || '/%')) as pattern_match,
    ('cims'::text = 'cims'::text) as bucket_match,
    (
        ('cims'::text = 'cims'::text) 
        AND (('3025715c-5ff8-425e-9735-0206857e499b/1769044816374-qpivszi04r.docx' ~~ ('3025715c-5ff8-425e-9735-0206857e499b' || '/%')) 
             OR ('3025715c-5ff8-425e-9735-0206857e499b/1769044816374-qpivszi04r.docx' = ('3025715c-5ff8-425e-9735-0206857e499b' || '/')))
    ) as full_policy_check;

-- Also check what auth.uid() returns when you're logged in
SELECT 
    auth.uid() as current_user_id,
    auth.uid()::text as current_user_id_text;

-- Check the exact policy definition
SELECT 
    policyname,
    cmd,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname = 'CIMs: Users can upload to own folder';
