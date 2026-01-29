-- Update subscription tier pricing and limits
-- Migration: 031_update_pricing_tiers.sql

-- Update Starter tier (formerly self_funded_early_bird)
UPDATE subscription_tiers 
SET 
  name = 'Starter (Founding Member)',
  price_monthly_cents = 7900,
  price_yearly_cents = 79000,
  cim_analyses_limit = 20,
  ioi_generations_limit = 5,
  loi_generations_limit = 3,
  description = 'For self-funded searchers. Founding Member pricing locked forever.'
WHERE id = 'self_funded_early_bird';

-- Add new Pro tier (founding member)
INSERT INTO subscription_tiers (
  id, tier_type, plan_type, name, description,
  price_monthly_cents, price_yearly_cents,
  cim_analyses_limit, ioi_generations_limit, loi_generations_limit,
  user_seats_limit,
  has_unlimited_analyses, has_team_collaboration, has_investor_dashboard,
  has_custom_branding, has_priority_support, has_founder_benefits
) VALUES (
  'pro_founding_member', 'pro', 'founding_member',
  'Pro (Founding Member)', 'For active searchers. Founding Member pricing locked forever.',
  17900, 179000,
  75, 20, 10,
  1,
  false, false, false, false, true, true
) ON CONFLICT (id) DO NOTHING;

-- Update Investor Portfolio tier (formerly search_fund_early_bird)
-- Note: Using placeholder price (99999999 = $999,999.99) to indicate custom pricing
-- Application logic should check for this value and treat as "custom pricing"
UPDATE subscription_tiers
SET
  name = 'Investor Portfolio',
  description = 'Custom pricing for investors tracking multiple searchers.',
  price_monthly_cents = 99999999,
  price_yearly_cents = 99999999,
  has_investor_dashboard = true,
  user_seats_limit = 10
WHERE id = 'search_fund_early_bird';
