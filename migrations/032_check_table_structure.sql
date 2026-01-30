-- ============================================
-- Diagnostic Query: Check Table Structures
-- Run this FIRST to see which tables have which columns
-- ============================================

-- Check workspaces table structure
SELECT 'workspaces' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workspaces' 
ORDER BY ordinal_position;

-- Check profiles table structure  
SELECT 'profiles' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check if workspaces has 'id' or 'workspace_id' as PK
SELECT 
  'workspaces' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' AND column_name = 'id'
  ) THEN 'Has id column' ELSE 'No id column' END as id_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' AND column_name = 'workspace_id'
  ) THEN 'Has workspace_id column' ELSE 'No workspace_id column' END as workspace_id_status;
