-- ============================================
-- Migration: Training data for ML fine-tuning
-- Description: Store 1-sentence pass reason + deal extracted metrics when user passes a deal.
-- ============================================

CREATE TABLE IF NOT EXISTS training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  pass_reason_sentence TEXT NOT NULL,
  extracted_metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_data_deal ON training_data(deal_id);
CREATE INDEX IF NOT EXISTS idx_training_data_workspace ON training_data(workspace_id);
CREATE INDEX IF NOT EXISTS idx_training_data_created ON training_data(created_at);

COMMENT ON TABLE training_data IS 'Pass verdicts with 1-sentence reason and deal metrics for future ML fine-tuning.';

ALTER TABLE training_data ENABLE ROW LEVEL SECURITY;

-- Users can insert training_data for their own workspace when they pass a deal
CREATE POLICY "Users can insert training_data for their workspace"
  ON training_data FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can read training_data in their workspace (e.g. for export or transparency)
CREATE POLICY "Users can view training_data in their workspace"
  ON training_data FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- No UPDATE/DELETE for training_data (append-only for ML integrity)
