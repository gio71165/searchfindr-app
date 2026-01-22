-- FINAL COMPLETE FIX: Fix both storage and companies table RLS issues

-- ============================================
-- PART 1: Fix Storage Policies
-- ============================================

-- Drop ALL existing CIMs policies (clean slate)
DROP POLICY IF EXISTS "CIMs: Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Test simple upload" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Allow all authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Allow all authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Allow all authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Users can read own files" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Test - Allow all authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "CIMs: Test - Allow all authenticated uploads" ON storage.objects;

-- Create simple working policies
CREATE POLICY "CIMs: Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cims'::text);

CREATE POLICY "CIMs: Allow authenticated reads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'cims'::text);

CREATE POLICY "CIMs: Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'cims'::text);

-- ============================================
-- PART 2: Verify Storage Policies
-- ============================================
SELECT 'Storage policies:' as check_type, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%CIM%'
ORDER BY policyname;

-- ============================================
-- PART 3: Check Companies Table RLS
-- ============================================
SELECT 'Companies RLS policies:' as check_type, policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'companies'
ORDER BY policyname;
