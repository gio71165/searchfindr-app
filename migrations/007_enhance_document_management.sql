-- ============================================
-- Migration: Enhance Document Management
-- Date: 2024
-- Description: Add folders, tags, versioning, activity tracking, and file metadata to deal_documents
-- ============================================

-- Add new columns to deal_documents table
ALTER TABLE deal_documents
  ADD COLUMN IF NOT EXISTS folder TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[], -- Array of tag strings
  ADD COLUMN IF NOT EXISTS file_size BIGINT, -- File size in bytes
  ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES deal_documents(id) ON DELETE SET NULL, -- For versioning
  ADD COLUMN IF NOT EXISTS accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accessed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;

-- Create index for search/filtering
CREATE INDEX IF NOT EXISTS idx_documents_folder ON deal_documents(deal_id, folder) WHERE folder IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_tags ON deal_documents USING GIN(tags) WHERE tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_type ON deal_documents(deal_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_parent ON deal_documents(parent_document_id) WHERE parent_document_id IS NOT NULL;

-- Create document_access_log table for tracking access history
CREATE TABLE IF NOT EXISTS document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES deal_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'preview')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_log_document ON document_access_log(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_workspace ON document_access_log(workspace_id, created_at DESC);

-- Enable RLS on document_access_log
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see access logs for documents in their workspace
CREATE POLICY "Users can view access logs in their workspace"
  ON document_access_log
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can insert access logs for documents in their workspace
CREATE POLICY "Users can insert access logs in their workspace"
  ON document_access_log
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );
