-- ============================================
-- Migration: Add missing foreign key indexes
-- ============================================
-- This migration adds indexes on foreign key columns to improve
-- query performance, especially for joins and foreign key constraint checks.
-- ============================================

-- BROKER_EMAIL_FILES table
-- Index on moved_to_deal_id foreign key
CREATE INDEX IF NOT EXISTS idx_broker_email_files_moved_to_deal_id 
  ON broker_email_files(moved_to_deal_id)
  WHERE moved_to_deal_id IS NOT NULL;

-- COMPANIES table
-- Index on broker_id foreign key
CREATE INDEX IF NOT EXISTS idx_companies_broker_id 
  ON companies(broker_id)
  WHERE broker_id IS NOT NULL;

-- Index on user_id foreign key
CREATE INDEX IF NOT EXISTS idx_companies_user_id 
  ON companies(user_id)
  WHERE user_id IS NOT NULL;

-- DEAL_ACTIVITIES table
-- Index on user_id foreign key
CREATE INDEX IF NOT EXISTS idx_deal_activities_user_id 
  ON deal_activities(user_id)
  WHERE user_id IS NOT NULL;

-- DEAL_CHAT_MESSAGES table
-- Index on user_id foreign key
CREATE INDEX IF NOT EXISTS idx_deal_chat_messages_user_id 
  ON deal_chat_messages(user_id)
  WHERE user_id IS NOT NULL;

-- DEAL_DOCUMENTS table
-- Index on accessed_by foreign key
CREATE INDEX IF NOT EXISTS idx_deal_documents_accessed_by 
  ON deal_documents(accessed_by)
  WHERE accessed_by IS NOT NULL;

-- Index on user_id foreign key
CREATE INDEX IF NOT EXISTS idx_deal_documents_user_id 
  ON deal_documents(user_id)
  WHERE user_id IS NOT NULL;

-- DOCUMENT_ACCESS_LOG table
-- Index on user_id foreign key
CREATE INDEX IF NOT EXISTS idx_document_access_log_user_id 
  ON document_access_log(user_id)
  WHERE user_id IS NOT NULL;

-- SAVED_FILTER_PRESETS table
-- Index on user_id foreign key
CREATE INDEX IF NOT EXISTS idx_saved_filter_presets_user_id 
  ON saved_filter_presets(user_id)
  WHERE user_id IS NOT NULL;

-- TRIAL_HISTORY table
-- Index on user_id foreign key
CREATE INDEX IF NOT EXISTS idx_trial_history_user_id 
  ON trial_history(user_id)
  WHERE user_id IS NOT NULL;

-- WORKSPACE_SAVED_DEALS table
-- Index on on_market_deal_id foreign key
CREATE INDEX IF NOT EXISTS idx_workspace_saved_deals_on_market_deal_id 
  ON workspace_saved_deals(on_market_deal_id)
  WHERE on_market_deal_id IS NOT NULL;
