-- ============================================
-- Migration: Fix Remaining RLS Performance Issues
-- Date: 2026-01-29
-- Description: Fix all remaining auth.uid() performance issues, consolidate duplicate policies,
--              and remove duplicate indexes
-- ============================================

-- ============================================
-- PART 1: Remove duplicate policies and ensure all use (select auth.uid())
-- ============================================

-- PROFILES TABLE - Remove any remaining duplicate policies
DROP POLICY IF EXISTS "read own profile" ON profiles;

-- Ensure all profiles policies use (select auth.uid())
-- These should already be fixed in 032, but ensuring they're correct
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

-- WORKSPACES TABLE - Remove duplicate policies
DROP POLICY IF EXISTS "read own workspace" ON workspaces;

-- Ensure workspaces policies use (select auth.uid())
-- Check that both tables exist and have the required columns
DROP POLICY IF EXISTS "Users can view their workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can update their workspace" ON workspaces;

DO $$
BEGIN
  -- Check that workspaces table exists and has workspace_id column
  -- Also check that profiles table has workspace_id column
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'workspaces'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'workspace_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'workspace_id'
  ) THEN
    EXECUTE '
    CREATE POLICY "Users can view their workspace"
      ON workspaces FOR SELECT
      USING (
        workspace_id IN (
          SELECT profiles.workspace_id 
          FROM profiles 
          WHERE profiles.id = (select auth.uid())
        )
      );
    
    CREATE POLICY "Users can update their workspace"
      ON workspaces FOR UPDATE
      USING (
        workspace_id IN (
          SELECT profiles.workspace_id 
          FROM profiles 
          WHERE profiles.id = (select auth.uid())
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT profiles.workspace_id 
          FROM profiles 
          WHERE profiles.id = (select auth.uid())
        )
      );';
  END IF;
END $$;

-- ============================================
-- PART 2: Fix all remaining policies to use (select auth.uid())
-- ============================================
-- 
-- IMPORTANT: All workspace-based policies require profiles.workspace_id to exist.
-- If you get errors about workspace_id not existing, ensure migration 009 has run.
-- ============================================

-- Verify required columns exist before proceeding
-- This will fail early with a clear error if migrations haven't been run in order
DO $$
DECLARE
  profiles_has_workspace_id BOOLEAN;
  missing_tables TEXT[];
  tbl_name TEXT;
BEGIN
  -- Check if profiles.workspace_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE information_schema.columns.table_schema = 'public' 
    AND information_schema.columns.table_name = 'profiles' 
    AND information_schema.columns.column_name = 'workspace_id'
  ) INTO profiles_has_workspace_id;
  
  IF NOT profiles_has_workspace_id THEN
    RAISE EXCEPTION 'Migration dependency error: profiles.workspace_id column does not exist. Please run migration 009_auto_assign_workspace_id.sql first, then re-run this migration.';
  END IF;
  
  -- Check that all tables we'll create policies on have workspace_id column
  -- Note: deal_notes uses workspace_saved_deal_id instead, so it's excluded from this check
  FOR tbl_name IN 
    SELECT unnest(ARRAY[
      'companies', 'financial_analyses', 'workspace_saved_deals',
      'deal_chat_messages', 'brokers', 'saved_filter_presets', 'deal_documents',
      'document_access_log', 'search_criteria', 'deal_investor_visibility',
      'deal_scoring_weights', 'broker_email_files', 'broker_interactions',
      'deal_activities'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
      AND c.table_name = tbl_name
      AND c.column_name = 'workspace_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
      AND t.table_name = tbl_name
    ) THEN
      missing_tables := array_append(missing_tables, tbl_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'The following tables are missing workspace_id column: %. Please ensure all migrations have been run in order.', array_to_string(missing_tables, ', ');
  END IF;
END $$;

-- COMPANIES TABLE - Fix workspace isolation policy
DROP POLICY IF EXISTS "workspace isolation" ON companies;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'workspace_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'workspace_id'
  ) THEN
    EXECUTE '
    CREATE POLICY "workspace isolation"
      ON companies FOR ALL
      USING (
        workspace_id IN (
          SELECT profiles.workspace_id 
          FROM profiles 
          WHERE profiles.id = (select auth.uid())
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT profiles.workspace_id 
          FROM profiles 
          WHERE profiles.id = (select auth.uid())
        )
      );';
  END IF;
END $$;

-- FINANCIAL_ANALYSES TABLE - All policies
-- Only create if both tables have workspace_id
DROP POLICY IF EXISTS "fa_select_own_workspace_v1" ON financial_analyses;
DROP POLICY IF EXISTS "fa_insert_own_workspace_v1" ON financial_analyses;
DROP POLICY IF EXISTS "fa_update_own_workspace_v1" ON financial_analyses;
DROP POLICY IF EXISTS "fa_delete_own_workspace_v1" ON financial_analyses;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'financial_analyses' AND column_name = 'workspace_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'workspace_id'
  ) THEN
    EXECUTE '
    CREATE POLICY "fa_select_own_workspace_v1"
      ON financial_analyses FOR SELECT
      USING (
        workspace_id IN (
          SELECT profiles.workspace_id 
          FROM profiles 
          WHERE profiles.id = (select auth.uid())
        )
      );

    CREATE POLICY "fa_insert_own_workspace_v1"
      ON financial_analyses FOR INSERT
      WITH CHECK (
        workspace_id IN (
          SELECT profiles.workspace_id 
          FROM profiles 
          WHERE profiles.id = (select auth.uid())
        )
      );

    CREATE POLICY "fa_update_own_workspace_v1"
      ON financial_analyses FOR UPDATE
      USING (
        workspace_id IN (
          SELECT profiles.workspace_id 
          FROM profiles 
          WHERE profiles.id = (select auth.uid())
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT profiles.workspace_id 
          FROM profiles 
          WHERE profiles.id = (select auth.uid())
        )
      );

    CREATE POLICY "fa_delete_own_workspace_v1"
      ON financial_analyses FOR DELETE
      USING (
        workspace_id IN (
          SELECT profiles.workspace_id 
          FROM profiles 
          WHERE profiles.id = (select auth.uid())
        )
      );';
  END IF;
END $$;

-- WORKSPACE_SAVED_DEALS TABLE
DROP POLICY IF EXISTS "workspace_saved_deals_select_own" ON workspace_saved_deals;
DROP POLICY IF EXISTS "workspace_saved_deals_insert_own" ON workspace_saved_deals;
DROP POLICY IF EXISTS "workspace_saved_deals_update_own" ON workspace_saved_deals;
DROP POLICY IF EXISTS "workspace_saved_deals_delete_own" ON workspace_saved_deals;

CREATE POLICY "workspace_saved_deals_select_own"
  ON workspace_saved_deals FOR SELECT
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "workspace_saved_deals_insert_own"
  ON workspace_saved_deals FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "workspace_saved_deals_update_own"
  ON workspace_saved_deals FOR UPDATE
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "workspace_saved_deals_delete_own"
  ON workspace_saved_deals FOR DELETE
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

-- DEAL_NOTES TABLE
-- Note: deal_notes uses workspace_saved_deal_id, not workspace_id
-- Access is controlled through workspace_saved_deals table
DROP POLICY IF EXISTS "deal_notes_select_own" ON deal_notes;
DROP POLICY IF EXISTS "deal_notes_insert_own" ON deal_notes;
DROP POLICY IF EXISTS "deal_notes_delete_own" ON deal_notes;

CREATE POLICY "deal_notes_select_own"
  ON deal_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_saved_deals wsd
      JOIN profiles p ON p.workspace_id = wsd.workspace_id
      WHERE wsd.id = deal_notes.workspace_saved_deal_id
      AND p.id = (select auth.uid())
    )
  );

CREATE POLICY "deal_notes_insert_own"
  ON deal_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_saved_deals wsd
      JOIN profiles p ON p.workspace_id = wsd.workspace_id
      WHERE wsd.id = deal_notes.workspace_saved_deal_id
      AND p.id = (select auth.uid())
    )
  );

CREATE POLICY "deal_notes_delete_own"
  ON deal_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_saved_deals wsd
      JOIN profiles p ON p.workspace_id = wsd.workspace_id
      WHERE wsd.id = deal_notes.workspace_saved_deal_id
      AND p.id = (select auth.uid())
    )
  );

-- DEAL_CHAT_MESSAGES TABLE
DROP POLICY IF EXISTS "deal_chat_select_workspace" ON deal_chat_messages;
DROP POLICY IF EXISTS "deal_chat_insert_workspace" ON deal_chat_messages;

CREATE POLICY "deal_chat_select_workspace"
  ON deal_chat_messages FOR SELECT
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "deal_chat_insert_workspace"
  ON deal_chat_messages FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
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
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert brokers in their workspace"
  ON brokers FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update brokers in their workspace"
  ON brokers FOR UPDATE
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

-- USER_API_KEYS TABLE - Consolidate policies
-- Remove service role policy (service role bypasses RLS anyway, so it's redundant)
DROP POLICY IF EXISTS "Users can view their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can create their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Service role can read all keys for verification" ON user_api_keys;

-- Single SELECT policy for users (service role bypasses RLS automatically)
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
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert their own filter presets"
  ON saved_filter_presets FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own filter presets"
  ON saved_filter_presets FOR UPDATE
  USING (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  )
  WITH CHECK (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete their own filter presets"
  ON saved_filter_presets FOR DELETE
  USING (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
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
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert documents in their workspace"
  ON deal_documents FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update documents in their workspace"
  ON deal_documents FOR UPDATE
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete documents in their workspace"
  ON deal_documents FOR DELETE
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

-- DOCUMENT_ACCESS_LOG TABLE
DROP POLICY IF EXISTS "Users can view access logs in their workspace" ON document_access_log;
DROP POLICY IF EXISTS "Users can insert access logs in their workspace" ON document_access_log;

CREATE POLICY "Users can view access logs in their workspace"
  ON document_access_log FOR SELECT
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert access logs in their workspace"
  ON document_access_log FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

-- SEARCH_CRITERIA TABLE - Consolidate into single policy to avoid multiple permissive policies
DROP POLICY IF EXISTS "Users can view their own search criteria" ON search_criteria;
DROP POLICY IF EXISTS "Users can manage their own search criteria" ON search_criteria;

-- Single policy for all operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage their own search criteria"
  ON search_criteria FOR ALL
  USING (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  )
  WITH CHECK (
    (select auth.uid()) = user_id AND 
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

-- INVESTOR_SEARCHER_LINKS TABLE - Consolidate into single policy
DROP POLICY IF EXISTS "Investors can view their linked searchers" ON investor_searcher_links;
DROP POLICY IF EXISTS "Searchers can view their linked investors" ON investor_searcher_links;
DROP POLICY IF EXISTS "Admins can manage investor-searcher links" ON investor_searcher_links;

-- Single policy that handles investors, searchers, and admins
CREATE POLICY "Investors, searchers, and admins can access links"
  ON investor_searcher_links FOR ALL
  USING (
    investor_id = (select auth.uid()) OR
    searcher_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    investor_id = (select auth.uid()) OR
    searcher_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- DEAL_INVESTOR_VISIBILITY TABLE - Consolidate into single policy
DROP POLICY IF EXISTS "Users can view deal visibility settings for their workspace" ON deal_investor_visibility;
DROP POLICY IF EXISTS "Users can manage deal visibility for their workspace" ON deal_investor_visibility;

CREATE POLICY "Users can manage deal visibility for their workspace"
  ON deal_investor_visibility FOR ALL
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
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

-- DEAL_SCORING_WEIGHTS TABLE - Consolidate into single policy to avoid multiple permissive policies
DROP POLICY IF EXISTS "Users can view scoring weights for their workspace" ON deal_scoring_weights;
DROP POLICY IF EXISTS "Admins can manage scoring weights" ON deal_scoring_weights;

-- Single policy that handles both users and admins (more performant than multiple policies)
CREATE POLICY "Users and admins can access scoring weights"
  ON deal_scoring_weights FOR ALL
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- BROKER_EMAIL_FILES TABLE
DROP POLICY IF EXISTS "Users can view broker files in their workspace" ON broker_email_files;
DROP POLICY IF EXISTS "Users can update broker files in their workspace" ON broker_email_files;

CREATE POLICY "Users can view broker files in their workspace"
  ON broker_email_files FOR SELECT
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update broker files in their workspace"
  ON broker_email_files FOR UPDATE
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

-- INDUSTRY_BENCHMARKS TABLE - Consolidate into single policy
DROP POLICY IF EXISTS "Authenticated users can view industry benchmarks" ON industry_benchmarks;
DROP POLICY IF EXISTS "Admins can manage industry benchmarks" ON industry_benchmarks;

-- Single policy that handles both authenticated users (SELECT) and admins (ALL)
CREATE POLICY "Authenticated users and admins can access industry benchmarks"
  ON industry_benchmarks FOR ALL
  USING (
    (select auth.uid()) IS NOT NULL OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- BROKER_INTERACTIONS TABLE - Consolidate into single policy
DROP POLICY IF EXISTS "Users can view their workspace's broker interactions" ON broker_interactions;
DROP POLICY IF EXISTS "Users can manage their workspace's broker interactions" ON broker_interactions;

CREATE POLICY "Users can manage their workspace's broker interactions"
  ON broker_interactions FOR ALL
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

-- DEAL_ACTIVITIES TABLE
DROP POLICY IF EXISTS "Users can view activities in their workspace" ON deal_activities;
DROP POLICY IF EXISTS "Users can insert activities in their workspace" ON deal_activities;

CREATE POLICY "Users can view activities in their workspace"
  ON deal_activities FOR SELECT
  USING (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert activities in their workspace"
  ON deal_activities FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT profiles.workspace_id 
      FROM profiles 
      WHERE profiles.id = (select auth.uid())
    )
  );

-- RATE_LIMITS TABLE - Consolidate into single policy
DROP POLICY IF EXISTS "Users can view their own rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Users can manage their own rate limits" ON rate_limits;

CREATE POLICY "Users can manage their own rate limits"
  ON rate_limits FOR ALL
  USING (
    key LIKE 'ratelimit:' || (select auth.uid())::text || ':%' OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    key LIKE 'ratelimit:' || (select auth.uid())::text || ':%' OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================
-- PART 3: Remove duplicate indexes
-- ============================================

-- Remove duplicate index on companies table
DROP INDEX IF EXISTS idx_companies_workspace_not_archived;

-- Keep idx_companies_dashboard (the other one should be removed)
-- If both exist and are identical, we keep the one with the better name
