-- ============================================
-- Migration: Analytics Events Table (Optional)
-- Date: 2024
-- Description: Create analytics_events table for future event tracking
-- NOTE: This is optional - current dashboard derives metrics from existing tables
-- ============================================

-- Create analytics_events table for future use
-- Currently, the admin dashboard derives all metrics from existing tables
-- This table can be used later for more granular event tracking

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id UUID,
  event_name TEXT NOT NULL,
  event_properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_workspace ON analytics_events(workspace_id);

-- RLS Policy: Admins can view all events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all analytics events"
  ON analytics_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Note: Service role will be used for inserts (bypasses RLS)
-- This table is optional and not required for the current dashboard to work
