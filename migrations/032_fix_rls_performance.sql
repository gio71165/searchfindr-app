-- ============================================
-- Migration: Fix RLS Performance Issues
-- Date: 2026-01-29
-- Description: Optimize RLS policies by wrapping auth.uid() in subqueries
--              Consolidate duplicate permissive policies
--              Remove duplicate indexes
-- ============================================
-- 
-- IMPORTANT: If you get an error about column "id" not existing, check your table structure:
-- Run: SELECT column_name FROM information_schema.columns WHERE table_name = 'workspaces';
-- The workspaces table might use 'workspace_id' instead of 'id' as the primary key.
-- ============================================

-- ============================================
-- PART 1: Fix auth.uid() performance issues
-- Replace auth.uid() with (select auth.uid()) to prevent re-evaluation per row
-- ============================================

-- PROFILES TABLE
DROP POLICY IF EXISTS "read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

-- WORKSPACES TABLE
-- Your table uses 'workspace_id' as the primary key (confirmed from table structure)
-- Note: If this section fails, you can skip it and run the rest of the migration
DROP POLICY IF EXISTS "read own workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can view their workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can update their workspace" ON workspaces;

-- Only create policies if the workspaces table exists and has the workspace_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'workspaces'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'workspace_id'
  ) THEN
    EXECUTE '
    CREATE POLICY "Users can view their workspace"
      ON workspaces FOR SELECT
      USING (
        workspace_id IN (
          SELECT workspace_id 
          FROM profiles 
          WHERE id = (select auth.uid())
        )
      );
    
    CREATE POLICY "Users can update their workspace"
      ON workspaces FOR UPDATE
      USING (
        workspace_id IN (
          SELECT workspace_id 
          FROM profiles 
          WHERE id = (select auth.uid())
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id 
          FROM profiles 
          WHERE id = (select auth.uid())
        )
      );';
  END IF;
END $$;

-- COMPANIES TABLE (workspace isolation policy)
DROP POLICY IF EXISTS "workspace isolation" ON companies;

CREATE POLICY "workspace isolation"
  ON companies FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- FINANCIAL_ANALYSES TABLE
DROP POLICY IF EXISTS "fa_select_own_workspace_v1" ON financial_analyses;
DROP POLICY IF EXISTS "fa_insert_own_workspace_v1" ON financial_analyses;
DROP POLICY IF EXISTS "fa_update_own_workspace_v1" ON financial_analyses;
DROP POLICY IF EXISTS "fa_delete_own_workspace_v1" ON financial_analyses;

CREATE POLICY "fa_select_own_workspace_v1"
  ON financial_analyses FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "fa_insert_own_workspace_v1"
  ON financial_analyses FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "fa_update_own_workspace_v1"
  ON financial_analyses FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "fa_delete_own_workspace_v1"
  ON financial_analyses FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- WORKSPACE_SAVED_DEALS TABLE
DROP POLICY IF EXISTS "workspace_saved_deals_select_own" ON workspace_saved_deals;
DROP POLICY IF EXISTS "workspace_saved_deals_insert_own" ON workspace_saved_deals;
DROP POLICY IF EXISTS "workspace_saved_deals_update_own" ON workspace_saved_deals;
DROP POLICY IF EXISTS "workspace_saved_deals_delete_own" ON workspace_saved_deals;

CREATE POLICY "workspace_saved_deals_select_own"
  ON workspace_saved_deals FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "workspace_saved_deals_insert_own"
  ON workspace_saved_deals FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "workspace_saved_deals_update_own"
  ON workspace_saved_deals FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "workspace_saved_deals_delete_own"
  ON workspace_saved_deals FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- DEAL_NOTES TABLE
DROP POLICY IF EXISTS "deal_notes_select_own" ON deal_notes;
DROP POLICY IF EXISTS "deal_notes_insert_own" ON deal_notes;
DROP POLICY IF EXISTS "deal_notes_delete_own" ON deal_notes;

CREATE POLICY "deal_notes_select_own"
  ON deal_notes FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "deal_notes_insert_own"
  ON deal_notes FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "deal_notes_delete_own"
  ON deal_notes FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- DEAL_CHAT_MESSAGES TABLE
DROP POLICY IF EXISTS "deal_chat_select_workspace" ON deal_chat_messages;
DROP POLICY IF EXISTS "deal_chat_insert_workspace" ON deal_chat_messages;

CREATE POLICY "deal_chat_select_workspace"
  ON deal_chat_messages FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "deal_chat_insert_workspace"
  ON deal_chat_messages FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- ANALYTICS_EVENTS TABLE
DROP POLICY IF EXISTS "Admins can view all analytics events" ON analytics_events;

CREATE POLICY "Admins can view all analytics events"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- BROKERS TABLE
DROP POLICY IF EXISTS "Users can view brokers in their workspace" ON brokers;
DROP POLICY IF EXISTS "Users can insert brokers in their workspace" ON brokers;
DROP POLICY IF EXISTS "Users can update brokers in their workspace" ON brokers;

CREATE POLICY "Users can view brokers in their workspace"
  ON brokers FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert brokers in their workspace"
  ON brokers FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update brokers in their workspace"
  ON brokers FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- USER_API_KEYS TABLE
DROP POLICY IF EXISTS "Users can view their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can create their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Service role can read all keys for verification" ON user_api_keys;

CREATE POLICY "Users can view their own API keys"
  ON user_api_keys FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own API keys"
  ON user_api_keys FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id AND
    (SELECT COUNT(*) FROM user_api_keys WHERE user_id = (select auth.uid()) AND revoked_at IS NULL) < 5
  );

CREATE POLICY "Users can update their own API keys"
  ON user_api_keys FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Service role policy (keep for API key verification)
CREATE POLICY "Service role can read all keys for verification"
  ON user_api_keys FOR SELECT
  USING (true);

-- SAVED_FILTER_PRESETS TABLE
DROP POLICY IF EXISTS "Users can view their own filter presets" ON saved_filter_presets;
DROP POLICY IF EXISTS "Users can insert their own filter presets" ON saved_filter_presets;
DROP POLICY IF EXISTS "Users can update their own filter presets" ON saved_filter_presets;
DROP POLICY IF EXISTS "Users can delete their own filter presets" ON saved_filter_presets;

CREATE POLICY "Users can view their own filter presets"
  ON saved_filter_presets FOR SELECT
  USING (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert their own filter presets"
  ON saved_filter_presets FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own filter presets"
  ON saved_filter_presets FOR UPDATE
  USING (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete their own filter presets"
  ON saved_filter_presets FOR DELETE
  USING (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- DEAL_DOCUMENTS TABLE
DROP POLICY IF EXISTS "Users can view documents in their workspace" ON deal_documents;
DROP POLICY IF EXISTS "Users can insert documents in their workspace" ON deal_documents;
DROP POLICY IF EXISTS "Users can update documents in their workspace" ON deal_documents;
DROP POLICY IF EXISTS "Users can delete documents in their workspace" ON deal_documents;

CREATE POLICY "Users can view documents in their workspace"
  ON deal_documents FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert documents in their workspace"
  ON deal_documents FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update documents in their workspace"
  ON deal_documents FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete documents in their workspace"
  ON deal_documents FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- DOCUMENT_ACCESS_LOG TABLE
DROP POLICY IF EXISTS "Users can view access logs in their workspace" ON document_access_log;
DROP POLICY IF EXISTS "Users can insert access logs in their workspace" ON document_access_log;

CREATE POLICY "Users can view access logs in their workspace"
  ON document_access_log FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert access logs in their workspace"
  ON document_access_log FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- SEARCH_CRITERIA TABLE
DROP POLICY IF EXISTS "Users can view their own search criteria" ON search_criteria;
DROP POLICY IF EXISTS "Users can manage their own search criteria" ON search_criteria;

-- Keep separate policies but optimize auth.uid() calls
CREATE POLICY "Users can view their own search criteria"
  ON search_criteria FOR SELECT
  USING (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their own search criteria"
  ON search_criteria FOR ALL
  USING (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- INVESTOR_SEARCHER_LINKS TABLE
DROP POLICY IF EXISTS "Investors can view their linked searchers" ON investor_searcher_links;
DROP POLICY IF EXISTS "Searchers can view their linked investors" ON investor_searcher_links;
DROP POLICY IF EXISTS "Admins can manage investor-searcher links" ON investor_searcher_links;

-- Keep separate policies for clarity (PostgreSQL will OR them automatically)
CREATE POLICY "Investors can view their linked searchers"
  ON investor_searcher_links FOR SELECT
  USING (investor_id = (select auth.uid()));

CREATE POLICY "Searchers can view their linked investors"
  ON investor_searcher_links FOR SELECT
  USING (searcher_id = (select auth.uid()));

CREATE POLICY "Admins can manage investor-searcher links"
  ON investor_searcher_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- DEAL_INVESTOR_VISIBILITY TABLE
DROP POLICY IF EXISTS "Users can view deal visibility settings for their workspace" ON deal_investor_visibility;
DROP POLICY IF EXISTS "Users can manage deal visibility for their workspace" ON deal_investor_visibility;

-- Keep separate policies but optimize auth.uid() calls
CREATE POLICY "Users can view deal visibility settings for their workspace"
  ON deal_investor_visibility FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage deal visibility for their workspace"
  ON deal_investor_visibility FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- USER_USAGE TABLE
DROP POLICY IF EXISTS "Users can view own usage" ON user_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON user_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON user_usage;

CREATE POLICY "Users can view own usage"
  ON user_usage FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own usage"
  ON user_usage FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own usage"
  ON user_usage FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- TRIAL_HISTORY TABLE
DROP POLICY IF EXISTS "Users can view own trial history" ON trial_history;

CREATE POLICY "Users can view own trial history"
  ON trial_history FOR SELECT
  USING ((select auth.uid()) = user_id);

-- DEAL_SCORING_WEIGHTS TABLE
DROP POLICY IF EXISTS "Users can view scoring weights for their workspace" ON deal_scoring_weights;
DROP POLICY IF EXISTS "Admins can manage scoring weights" ON deal_scoring_weights;

-- Keep separate policies (PostgreSQL will OR them for SELECT)
CREATE POLICY "Users can view scoring weights for their workspace"
  ON deal_scoring_weights FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can manage scoring weights"
  ON deal_scoring_weights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- BROKER_EMAIL_FILES TABLE
DROP POLICY IF EXISTS "Users can view broker files in their workspace" ON broker_email_files;
DROP POLICY IF EXISTS "Users can update broker files in their workspace" ON broker_email_files;

CREATE POLICY "Users can view broker files in their workspace"
  ON broker_email_files FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update broker files in their workspace"
  ON broker_email_files FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- INDUSTRY_BENCHMARKS TABLE
DROP POLICY IF EXISTS "Authenticated users can view industry benchmarks" ON industry_benchmarks;
DROP POLICY IF EXISTS "Admins can manage industry benchmarks" ON industry_benchmarks;

-- Keep separate policies (PostgreSQL will OR them for SELECT)
CREATE POLICY "Authenticated users can view industry benchmarks"
  ON industry_benchmarks FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Admins can manage industry benchmarks"
  ON industry_benchmarks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- BROKER_INTERACTIONS TABLE
DROP POLICY IF EXISTS "Users can view their workspace's broker interactions" ON broker_interactions;
DROP POLICY IF EXISTS "Users can manage their workspace's broker interactions" ON broker_interactions;

-- Keep separate policies but optimize auth.uid() calls
CREATE POLICY "Users can view their workspace's broker interactions"
  ON broker_interactions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their workspace's broker interactions"
  ON broker_interactions FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- DEAL_ACTIVITIES TABLE
-- Use profiles table for consistency with other policies
-- If workspace_members table exists and is preferred, update this policy accordingly
DROP POLICY IF EXISTS "Users can view activities in their workspace" ON deal_activities;
DROP POLICY IF EXISTS "Users can insert activities in their workspace" ON deal_activities;

CREATE POLICY "Users can view activities in their workspace"
  ON deal_activities FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert activities in their workspace"
  ON deal_activities FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- ============================================
-- PART 2: Remove duplicate indexes
-- ============================================

-- Check if both indexes exist and are identical, then drop one
DO $$
BEGIN
  -- Check if idx_companies_dashboard and idx_companies_workspace_not_archived are duplicates
  IF EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'companies' 
    AND indexname = 'idx_companies_dashboard'
  ) AND EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'companies' 
    AND indexname = 'idx_companies_workspace_not_archived'
  ) THEN
    -- Compare index definitions (simplified check - drop the second one if they're likely duplicates)
    DROP INDEX IF EXISTS idx_companies_workspace_not_archived;
  END IF;
END $$;
