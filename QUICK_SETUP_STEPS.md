# Quick Setup Steps for Document Upload

## ✅ Step 1: Run Migration in Supabase (REQUIRED)

1. Open Supabase Dashboard → SQL Editor
2. Copy the ENTIRE contents of `migrations/007_enhance_document_management.sql`
3. Paste and click "Run"
4. Verify success message

## ✅ Step 2: Create Storage Bucket (REQUIRED)

1. Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `deal_documents`
4. **Public:** NO (keep private)
5. Click "Create bucket"

## ✅ Step 3: Set Storage Policies (REQUIRED)

Run this in Supabase SQL Editor:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload documents in their workspace"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'deal_documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM auth.users WHERE id = auth.uid()
  )
);

-- Allow users to read documents
CREATE POLICY "Users can read documents in their workspace"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deal_documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM auth.users WHERE id = auth.uid()
  )
);

-- Allow users to delete documents
CREATE POLICY "Users can delete documents in their workspace"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'deal_documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM auth.users WHERE id = auth.uid()
  )
);
```

## ✅ Step 4: Commit & Deploy

```bash
git add .
git commit -m "Add document management with folders, tags, and versioning"
git push origin main
```

Vercel will automatically deploy!

## 🧪 Step 5: Test After Deployment

1. Go to any deal detail page
2. Click "Add Document" 
3. Upload a test PDF
4. Verify it appears in the list

## ❌ If Upload Still Doesn't Work

Check browser console (F12) for errors. Common issues:
- Storage bucket doesn't exist → Create it (Step 2)
- RLS policies missing → Add them (Step 3)
- Migration not run → Run migration (Step 1)
