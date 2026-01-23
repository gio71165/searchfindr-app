-- ============================================
-- Migration: Investor Dashboard
-- Date: 2024
-- Description: Add user roles, investor-searcher relationships, and deal visibility controls
-- ============================================

-- ============================================
-- PART 1: Add role to profiles
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'searcher' 
  CHECK (role IN ('searcher', 'investor', 'admin'));

-- ============================================
-- PART 2: Create investor_searcher_links table
-- ============================================

CREATE TABLE IF NOT EXISTS investor_searcher_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  searcher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  
  access_level TEXT DEFAULT 'summary' CHECK (access_level IN ('full', 'summary')),
  -- 'full' = see all deal details including company names
  -- 'summary' = see aggregated metrics only
  
  capital_committed DECIMAL(15,2), -- how much this investor committed to this searcher
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(investor_id, searcher_id, workspace_id)
);

-- ============================================
-- PART 3: Deal visibility settings
-- ============================================

CREATE TABLE IF NOT EXISTS deal_investor_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  
  visible_to_investors BOOLEAN DEFAULT true,
  show_company_name BOOLEAN DEFAULT false,
  show_financials BOOLEAN DEFAULT true,
  show_ai_analysis BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id)
);

-- ============================================
-- PART 4: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_investor_links_investor ON investor_searcher_links(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_links_searcher ON investor_searcher_links(searcher_id);
CREATE INDEX IF NOT EXISTS idx_investor_links_workspace ON investor_searcher_links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deal_visibility_deal ON deal_investor_visibility(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_visibility_workspace ON deal_investor_visibility(workspace_id);

-- ============================================
-- PART 5: Enable RLS
-- ============================================

ALTER TABLE investor_searcher_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_investor_visibility ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 6: RLS Policies for investor_searcher_links
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Investors can view their linked searchers" ON investor_searcher_links;
DROP POLICY IF EXISTS "Searchers can view their linked investors" ON investor_searcher_links;
DROP POLICY IF EXISTS "Admins can manage investor-searcher links" ON investor_searcher_links;

-- View policy for investors
CREATE POLICY "Investors can view their linked searchers"
  ON investor_searcher_links FOR SELECT
  USING (investor_id = auth.uid());

-- View policy for searchers
CREATE POLICY "Searchers can view their linked investors"
  ON investor_searcher_links FOR SELECT
  USING (searcher_id = auth.uid());

-- Admin policy for managing links (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage investor-searcher links"
  ON investor_searcher_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- PART 7: RLS Policies for deal_investor_visibility
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view deal visibility settings for their workspace" ON deal_investor_visibility;
DROP POLICY IF EXISTS "Users can manage deal visibility for their workspace" ON deal_investor_visibility;

-- View policy
CREATE POLICY "Users can view deal visibility settings for their workspace"
  ON deal_investor_visibility FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
  ));

-- Manage policy (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage deal visibility for their workspace"
  ON deal_investor_visibility FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
  ));

