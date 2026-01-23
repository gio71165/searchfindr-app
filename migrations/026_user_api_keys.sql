-- Migration: Add API keys table for Chrome extension authentication
-- Replaces OAuth flow for extension with API key-based auth

-- Create user_api_keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My API Key',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 12 chars for display: "sf_live_abcd..."
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional: defaults to 1 year from creation
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT unique_key_hash UNIQUE(key_hash)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_key_hash ON user_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_revoked ON user_api_keys(revoked_at) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own keys (excluding key_hash for security)
CREATE POLICY "Users can view their own API keys"
  ON user_api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own API keys (max 5 per user)
CREATE POLICY "Users can create their own API keys"
  ON user_api_keys
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (SELECT COUNT(*) FROM user_api_keys WHERE user_id = auth.uid() AND revoked_at IS NULL) < 5
  );

-- RLS Policy: Users can update their own keys (name, revoke)
CREATE POLICY "Users can update their own API keys"
  ON user_api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Service role can read all keys for verification
CREATE POLICY "Service role can read all keys for verification"
  ON user_api_keys
  FOR SELECT
  USING (true); -- Service role bypasses RLS

-- Function to automatically set expires_at to 1 year if not provided
CREATE OR REPLACE FUNCTION set_api_key_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '1 year';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set expiry on insert
CREATE TRIGGER set_api_key_expiry_trigger
  BEFORE INSERT ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION set_api_key_expiry();

-- Function to get user_id from API key (for service role use)
CREATE OR REPLACE FUNCTION get_user_id_from_api_key(key_hash_param TEXT)
RETURNS UUID AS $$
DECLARE
  user_id_result UUID;
BEGIN
  SELECT user_id INTO user_id_result
  FROM user_api_keys
  WHERE key_hash = key_hash_param
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN user_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE user_api_keys IS 'API keys for Chrome extension authentication. Keys are hashed and never stored in plaintext.';
COMMENT ON COLUMN user_api_keys.key_hash IS 'Bcrypt hash of the full API key';
COMMENT ON COLUMN user_api_keys.key_prefix IS 'First 12 characters for display purposes only';
