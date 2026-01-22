-- Step 1: Check if bucket exists
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'cims';

-- Step 2: Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cims',
  'cims',
  false,  -- Private bucket
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

-- Step 3: Verify bucket was created/updated
SELECT 
    id,
    name,
    public,
    file_size_limit
FROM storage.buckets
WHERE name = 'cims';
