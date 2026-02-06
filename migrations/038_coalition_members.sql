-- ============================================
-- Migration: Coalition members (coalition branding)
-- Description: Searchers with coalition branding; coalition admin sees only these in Command Center (like investor sees linked searchers).
-- ============================================

-- Coalition member = searcher whose workspace is part of the coalition (they see coalition branding; same app as regular searcher).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_coalition_member BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_coalition_member
  ON profiles(is_coalition_member) WHERE is_coalition_member = TRUE;

COMMENT ON COLUMN profiles.is_coalition_member IS 'When true, this searcher has coalition branding and is visible to coalition admin in the Command Center.';

-- Clarify coalition leader comment
COMMENT ON COLUMN profiles.is_coalition_leader IS 'When true, user can access /coalition/dashboard (Command Center) and see only coalition members.';
