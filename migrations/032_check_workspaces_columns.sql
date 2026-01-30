-- Check ALL columns in workspaces table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'workspaces' 
ORDER BY ordinal_position;
