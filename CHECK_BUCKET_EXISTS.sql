-- Check if the cims bucket actually exists
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE name = 'cims';

-- If the above returns no rows, the bucket doesn't exist and needs to be created
-- Run this to create it:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'cims',
--   'cims',
--   false,
--   52428800,
--   ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
-- );
