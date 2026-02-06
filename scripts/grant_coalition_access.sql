-- ============================================
-- Grant Coalition Access
-- Run in Supabase SQL Editor (or psql).
-- ============================================
-- PREREQUISITES: Run migrations 037_coalition_dashboard.sql and 038_coalition_members.sql
--   so that profiles.is_coalition_leader, profiles.is_coalition_member, and coalition_broadcasts exist.
--
-- Coalition admin = only one(s) who see the Command Center (/coalition/dashboard).
-- Coalition members = searchers with coalition branding; admin sees only these (like investor sees linked searchers).
-- ============================================

-- ========== HOW TO MAKE SOMEONE A COALITION SEARCHER ==========
-- Run ONE of the following (uncomment and replace the email or UUID), then run the block:
--
-- By searcher email (e.g. jane@example.com):
--   UPDATE profiles SET is_coalition_member = TRUE
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'jane@example.com' LIMIT 1);
--
-- By searcher user UUID (from auth.users or profiles):
--   UPDATE profiles SET is_coalition_member = TRUE WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
-- =============================================================

-- ---------- COALITION ADMIN (sees Command Center) ----------
-- Option A: Grant by email (replace YOUR_ADMIN_EMAIL_HERE)
UPDATE profiles
SET is_coalition_leader = TRUE
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'YOUR_ADMIN_EMAIL_HERE' LIMIT 1
);

-- Option B: Grant by user UUID
-- UPDATE profiles SET is_coalition_leader = TRUE WHERE id = '00000000-0000-0000-0000-000000000000';

-- Option C: Make all current admins coalition leaders
-- UPDATE profiles SET is_coalition_leader = TRUE WHERE is_admin = TRUE;


-- ---------- COALITION MEMBERS (searchers with coalition branding; visible to coalition admin) ----------
-- Run one of these to add a searcher to the coalition (they get the "Coalition" badge and appear in Command Center).
-- Option D: By searcher email (replace searcher@example.com; run separately for each searcher)
-- UPDATE profiles SET is_coalition_member = TRUE WHERE id = (SELECT id FROM auth.users WHERE email = 'searcher@example.com' LIMIT 1);

-- Option E: By searcher user UUID
-- UPDATE profiles SET is_coalition_member = TRUE WHERE id = '00000000-0000-0000-0000-000000000000';

-- Option F: List current coalition members (verify)
-- SELECT p.id, u.email, p.workspace_id, p.is_coalition_member
-- FROM profiles p
-- JOIN auth.users u ON u.id = p.id
-- WHERE p.is_coalition_member = TRUE;


-- Verify coalition leaders (optional)
-- SELECT p.id, u.email, p.is_admin, p.is_coalition_leader
-- FROM profiles p
-- JOIN auth.users u ON u.id = p.id
-- WHERE p.is_coalition_leader = TRUE OR p.is_admin = TRUE;
