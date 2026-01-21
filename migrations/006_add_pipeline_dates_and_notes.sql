-- ============================================
-- Migration: Add Pipeline Dates, Notes, Tags, and Broker Tracking
-- Date: 2024
-- Description: Add IOI/LOI dates, user notes, tags, and broker management
-- ============================================

-- ============================================
-- PART 1: Add pipeline date tracking columns
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS ioi_date DATE,
  ADD COLUMN IF NOT EXISTS loi_date DATE,
  ADD COLUMN IF NOT EXISTS expected_close_date DATE,
  ADD COLUMN IF NOT EXISTS deal_value NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS user_notes TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ============================================
-- PART 2: Create brokers table
-- ============================================

CREATE TABLE IF NOT EXISTS brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  firm TEXT,
  email TEXT,
  phone TEXT,
  quality_rating TEXT CHECK (quality_rating IN ('excellent', 'good', 'average', 'poor', null)),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brokers_workspace ON brokers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_brokers_name ON brokers(workspace_id, name);

-- ============================================
-- PART 3: Add broker_id to companies table
-- ============================================

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_broker ON companies(workspace_id, broker_id);

-- ============================================
-- PART 4: Create saved_filter_presets table
-- ============================================

CREATE TABLE IF NOT EXISTS saved_filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filter_presets_user ON saved_filter_presets(workspace_id, user_id);

-- ============================================
-- PART 5: Create deal_documents table
-- ============================================

CREATE TABLE IF NOT EXISTS deal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  deal_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  document_type TEXT CHECK (document_type IN ('cim', 'financials', 'loi', 'term_sheet', 'other')),
  version INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_deal ON deal_documents(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_workspace ON deal_documents(workspace_id);

-- ============================================
-- PART 6: RLS Policies
-- ============================================

ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;

-- Brokers policies
CREATE POLICY "Users can view brokers in their workspace"
ON brokers FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert brokers in their workspace"
ON brokers FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update brokers in their workspace"
ON brokers FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

-- Filter presets policies
CREATE POLICY "Users can view their own filter presets"
ON saved_filter_presets FOR SELECT
USING (user_id = auth.uid() AND workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert their own filter presets"
ON saved_filter_presets FOR INSERT
WITH CHECK (user_id = auth.uid() AND workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update their own filter presets"
ON saved_filter_presets FOR UPDATE
USING (user_id = auth.uid() AND workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete their own filter presets"
ON saved_filter_presets FOR DELETE
USING (user_id = auth.uid() AND workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

-- Documents policies
CREATE POLICY "Users can view documents in their workspace"
ON deal_documents FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert documents in their workspace"
ON deal_documents FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update documents in their workspace"
ON deal_documents FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete documents in their workspace"
ON deal_documents FOR DELETE
USING (workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after executing the migration to verify:
--
-- 1. Check columns were added:
--    SELECT column_name, data_type 
--    FROM information_schema.columns 
--    WHERE table_name = 'companies' 
--    AND column_name IN ('ioi_date', 'loi_date', 'expected_close_date', 'deal_value', 'user_notes', 'tags', 'broker_id');
--
-- 2. Check tables were created:
--    SELECT * FROM brokers LIMIT 1;
--    SELECT * FROM saved_filter_presets LIMIT 1;
--    SELECT * FROM deal_documents LIMIT 1;
