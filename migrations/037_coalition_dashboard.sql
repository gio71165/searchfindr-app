-- ============================================
-- Migration: Coalition Dashboard
-- Description: Coalition Leader role and broadcast nudges for Command Center
-- ============================================

-- ============================================
-- PART 1: Coalition leader access
-- ============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_coalition_leader BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_coalition_leader
  ON profiles(is_coalition_leader) WHERE is_coalition_leader = TRUE;

COMMENT ON COLUMN profiles.is_coalition_leader IS 'When true, user can access /coalition/dashboard (Command Center) and see all linked searchers.';

-- ============================================
-- PART 2: Coalition broadcasts (nudges)
-- ============================================

CREATE TABLE IF NOT EXISTS coalition_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL DEFAULT 'Consider moving deals forward — your pipeline is waiting!',
  target_stage TEXT NOT NULL DEFAULT 'reviewing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coalition_broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES coalition_broadcasts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(broadcast_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_coalition_broadcasts_sent_by ON coalition_broadcasts(sent_by);
CREATE INDEX IF NOT EXISTS idx_coalition_broadcast_recipients_broadcast ON coalition_broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_coalition_broadcast_recipients_workspace ON coalition_broadcast_recipients(workspace_id);

-- ============================================
-- PART 3: RLS for coalition_broadcasts
-- ============================================

ALTER TABLE coalition_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coalition_broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Coalition leaders and admins can insert broadcasts
CREATE POLICY "Coalition leaders can create broadcasts"
  ON coalition_broadcasts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (is_coalition_leader = TRUE OR is_admin = TRUE)
    )
  );

-- Coalition leaders and admins can view all broadcasts
CREATE POLICY "Coalition leaders can view broadcasts"
  ON coalition_broadcasts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (is_coalition_leader = TRUE OR is_admin = TRUE)
    )
  );

-- Searchers can view recipients for their workspace (to show "you have a nudge")
CREATE POLICY "Searchers can view broadcast recipients for their workspace"
  ON coalition_broadcast_recipients FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Coalition leaders can insert recipients when sending broadcast
CREATE POLICY "Coalition leaders can insert broadcast recipients"
  ON coalition_broadcast_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (is_coalition_leader = TRUE OR is_admin = TRUE)
    )
  );

-- Searchers can update seen_at for their workspace
CREATE POLICY "Searchers can mark broadcast as seen"
  ON coalition_broadcast_recipients FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (true);
