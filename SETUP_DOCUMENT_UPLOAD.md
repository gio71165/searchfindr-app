# Document Upload Setup Guide

## ✅ Pre-Deployment Checklist

### 1. TypeScript Build Status
- ✅ **PASSED** - No TypeScript errors found
- Build completed successfully

### 2. Database Migration Required

**You MUST run migration 007 in Supabase before document uploads will work fully:**

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `migrations/007_enhance_document_management.sql`
3. Run the migration

**What this migration adds:**
- `folder` column for organizing documents
- `tags` array column for document tagging
- `file_size` column for file size tracking
- `parent_document_id` for versioning support
- `accessed_at`, `accessed_by`, `access_count` for access tracking
- `document_access_log` table for detailed access history

**Note:** The code has graceful degradation - uploads will work WITHOUT this migration, but advanced features (folders, tags, versioning) won't be available.

### 3. Storage Bucket Setup

**Create the `deal_documents` storage bucket in Supabase:**

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `deal_documents`
4. **Public bucket:** NO (keep it private)
5. Click "Create bucket"

**Set up RLS policies for the bucket:**

Run this SQL in Supabase SQL Editor:

```sql
-- Allow authenticated users to upload files to their workspace folder
CREATE POLICY "Users can upload documents in their workspace"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'deal_documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM auth.users WHERE id = auth.uid()
  )
);

-- Allow users to read documents in their workspace
CREATE POLICY "Users can read documents in their workspace"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deal_documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM auth.users WHERE id = auth.uid()
  )
);

-- Allow users to delete documents in their workspace
CREATE POLICY "Users can delete documents in their workspace"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'deal_documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM auth.users WHERE id = auth.uid()
  )
);
```

### 4. Git Commit & Deploy

**Before committing, verify:**
- ✅ TypeScript build passes (`npm run build`)
- ✅ Migration 007 has been run in Supabase
- ✅ `deal_documents` storage bucket exists
- ✅ Storage bucket RLS policies are set up

**Then commit and deploy:**

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Add document management features with folders, tags, and versioning"

# Push to main (will trigger Vercel deployment)
git push origin main
```

### 5. Post-Deployment Verification

After deploying to Vercel:

1. **Test document upload:**
   - Go to any deal detail page
   - Click "Add Document"
   - Upload a test PDF
   - Verify it appears in the documents list

2. **Test advanced features (if migration 007 was run):**
   - Try adding a folder
   - Try adding tags
   - Verify file size is displayed

3. **Check browser console for errors:**
   - Open DevTools (F12)
   - Look for any errors in Console tab
   - Check Network tab for failed API calls

## Troubleshooting

### Upload fails with "Failed to upload file"
- **Check:** Storage bucket `deal_documents` exists
- **Check:** Storage bucket RLS policies are set up correctly
- **Check:** User is authenticated

### Upload works but document doesn't appear
- **Check:** Migration 006 was run (creates `deal_documents` table)
- **Check:** Browser console for API errors
- **Check:** Network tab for failed requests to `/api/deals/[id]/documents`

### Advanced features (folders/tags) don't work
- **Check:** Migration 007 was run in Supabase
- **Check:** No errors in Supabase logs about missing columns

## Files Changed

- `migrations/007_enhance_document_management.sql` - Database migration
- `app/api/deals/[id]/documents/route.ts` - Upload API endpoint
- `components/deal/DealDocuments.tsx` - Document management UI
- `lib/data-access/documents.ts` - Document repository
