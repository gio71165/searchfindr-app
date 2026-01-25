-- ============================================
-- Migration: Guest CIM Uploads Tracking
-- Date: 2024
-- Description: Track guest CIM uploads by email to limit to 1 per email
-- ============================================

CREATE TABLE IF NOT EXISTS guest_cim_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on email to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_uploads_email ON guest_cim_uploads(email);

-- Create index on uploaded_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_guest_uploads_uploaded_at ON guest_cim_uploads(uploaded_at);

-- Add comment
COMMENT ON TABLE guest_cim_uploads IS 'Tracks guest CIM uploads to enforce 1 upload per email limit';
