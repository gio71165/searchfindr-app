-- Migration: Subscription System
-- Description: Creates complete subscription system with Stripe integration, 
--              7-day free trials, and usage limits
-- Date: 2025-01-24

-- 1. Add subscription fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS has_had_trial BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD CONSTRAINT valid_subscription_tier 
  CHECK (subscription_tier IN ('none', 'self_funded', 'search_fund'));

ALTER TABLE profiles
ADD CONSTRAINT valid_subscription_status
  CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled'));

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription ON profiles(stripe_subscription_id);

-- 2. Create subscription tiers configuration table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY,
  tier_type TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly_cents INT NOT NULL,
  price_yearly_cents INT,
  
  -- Usage limits (NULL = unlimited)
  cim_analyses_limit INT,
  ioi_generations_limit INT,
  loi_generations_limit INT,
  user_seats_limit INT DEFAULT 1,
  
  -- Feature flags
  has_unlimited_analyses BOOLEAN DEFAULT false,
  has_team_collaboration BOOLEAN DEFAULT false,
  has_investor_dashboard BOOLEAN DEFAULT false,
  has_custom_branding BOOLEAN DEFAULT false,
  has_priority_support BOOLEAN DEFAULT false,
  has_founder_benefits BOOLEAN DEFAULT false,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subscription tiers"
  ON subscription_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Insert tier configurations
INSERT INTO subscription_tiers (
  id, tier_type, plan_type, name, description,
  price_monthly_cents, price_yearly_cents,
  cim_analyses_limit, ioi_generations_limit, loi_generations_limit,
  user_seats_limit,
  has_unlimited_analyses, has_team_collaboration, has_investor_dashboard,
  has_custom_branding, has_priority_support, has_founder_benefits
) VALUES
(
  'self_funded_early_bird', 'self_funded', 'early_bird',
  'Self-Funded Searcher (Early Bird)', 'For bootstrapped searchers. Early bird pricing locked forever.',
  4900, 49000,
  20, 5, 2,
  1,
  false, false, false, false, false, false
),
(
  'search_fund_early_bird', 'search_fund', 'early_bird',
  'Traditional Search Fund (Early Bird)', 'Unlimited everything + founder benefits.',
  14900, 149000,
  NULL, NULL, NULL,
  3,
  true, true, true, true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create user usage tracking table
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID, -- Optional: workspace reference (no FK constraint to avoid schema dependency)
  
  -- Usage counters (reset monthly)
  cim_analyses_count INT DEFAULT 0,
  ioi_generations_count INT DEFAULT 0,
  loi_generations_count INT DEFAULT 0,
  
  -- Billing period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, period_start)
);

ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON user_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON user_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON user_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_usage_user_period ON user_usage(user_id, period_start);

-- 4. Create trial history table (prevent abuse)
CREATE TABLE IF NOT EXISTS trial_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  trial_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  trial_ended_at TIMESTAMP WITH TIME ZONE,
  converted_to_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE trial_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trial history"
  ON trial_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trial_history_email ON trial_history(email);

-- 5. Function to check trial eligibility
CREATE OR REPLACE FUNCTION check_trial_eligibility(
  p_user_id UUID,
  p_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_had_trial BOOLEAN;
  v_trial_count INT;
BEGIN
  -- Check if user has had trial
  SELECT has_had_trial INTO v_has_had_trial
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_has_had_trial THEN
    RETURN false;
  END IF;
  
  -- Check trial history by email
  SELECT COUNT(*) INTO v_trial_count
  FROM trial_history
  WHERE email = p_email;
  
  IF v_trial_count > 0 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
