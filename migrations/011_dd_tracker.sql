-- ============================================
-- Migration: Due Diligence Tracker
-- Date: 2024
-- Description: Add DD categories and items tables for tracking due diligence progress
-- ============================================

-- ============================================
-- PART 1: Create DD Categories table
-- ============================================

CREATE TABLE IF NOT EXISTS dd_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  deal_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 2: Create DD Items table
-- ============================================

CREATE TABLE IF NOT EXISTS dd_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES dd_categories(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'requested', 'received', 'reviewed', 'issue_found', 'cleared'
  )),
  
  requested_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ,
  reviewed_date TIMESTAMPTZ,
  
  assigned_to TEXT, -- email or name
  notes TEXT,
  
  issue_description TEXT,
  issue_severity TEXT CHECK (issue_severity IN ('blocker', 'major', 'minor', 'info') OR issue_severity IS NULL),
  
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 3: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_dd_categories_deal ON dd_categories(deal_id);
CREATE INDEX IF NOT EXISTS idx_dd_categories_workspace ON dd_categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dd_items_category ON dd_items(category_id);
CREATE INDEX IF NOT EXISTS idx_dd_items_deal ON dd_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_dd_items_workspace ON dd_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dd_items_status ON dd_items(status);

-- ============================================
-- PART 4: Enable RLS
-- ============================================

ALTER TABLE dd_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 5: RLS Policies for DD Categories
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their workspace's DD categories" ON dd_categories;
DROP POLICY IF EXISTS "Users can manage their workspace's DD categories" ON dd_categories;

-- View policy
CREATE POLICY "Users can view their workspace's DD categories"
  ON dd_categories FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
  ));

-- Manage policy (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage their workspace's DD categories"
  ON dd_categories FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================
-- PART 6: RLS Policies for DD Items
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their workspace's DD items" ON dd_items;
DROP POLICY IF EXISTS "Users can manage their workspace's DD items" ON dd_items;

-- View policy
CREATE POLICY "Users can view their workspace's DD items"
  ON dd_items FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
  ));

-- Manage policy (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage their workspace's DD items"
  ON dd_items FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================
-- PART 7: Create updated_at trigger function
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_dd_categories_updated_at ON dd_categories;
CREATE TRIGGER update_dd_categories_updated_at
  BEFORE UPDATE ON dd_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dd_items_updated_at ON dd_items;
CREATE TRIGGER update_dd_items_updated_at
  BEFORE UPDATE ON dd_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

