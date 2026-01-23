-- Migration: Enable Realtime for Investor Dashboard
-- Description: Enables realtime subscriptions on companies and deal_activities tables
--              so investor dashboards automatically update when searchers make changes
--
-- IMPORTANT: This migration requires Supabase Realtime to be enabled.
-- Run these commands in Supabase SQL Editor or via Supabase CLI:
--
-- Note: Realtime is typically enabled by default on new tables in Supabase.
-- If realtime is not working, you may need to enable it manually via:
-- 1. Supabase Dashboard → Database → Replication
-- 2. Or run: ALTER PUBLICATION supabase_realtime ADD TABLE companies;
-- 3. Or run: ALTER PUBLICATION supabase_realtime ADD TABLE deal_activities;
--
-- This migration documents the requirement but doesn't actually enable realtime
-- (that must be done through Supabase dashboard or management API)

-- Verify realtime is enabled (this will show current publication status)
-- SELECT schemaname, tablename 
-- FROM pg_publication_tables 
-- WHERE pubname = 'supabase_realtime' 
--   AND tablename IN ('companies', 'deal_activities');

-- If tables are not in the publication, enable them:
-- ALTER PUBLICATION supabase_realtime ADD TABLE companies;
-- ALTER PUBLICATION supabase_realtime ADD TABLE deal_activities;

-- Note: The investor dashboard uses Supabase realtime subscriptions to automatically
-- refresh when searchers update deals, stages, verdicts, or activities.
-- See: app/investor/hooks/useInvestorRealtime.ts
