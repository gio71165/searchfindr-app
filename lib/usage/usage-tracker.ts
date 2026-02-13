import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UsageData {
  cim_analyses_used: number;
  cim_analyses_limit: number | null;
  ioi_generations_used: number;
  ioi_generations_limit: number | null;
  loi_generations_used: number;
  loi_generations_limit: number | null;
  period_start: string;
  period_end: string;
  subscription_tier: string;
  subscription_status: string;
}

export async function getCurrentUsage(userId: string): Promise<UsageData | null> {
  try {
    // Get user's subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_plan, subscription_status')
      .eq('id', userId)
      .single();

    if (!profile) return null;

    // Get tier limits
    const { data: tier } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('tier_type', profile.subscription_tier)
      .eq('plan_type', profile.subscription_plan)
      .single();

    // Get current period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get or create usage record
    const { data: usage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('period_start', periodStart.toISOString())
      .single();

    if (!usage) {
      // Create usage record
      await supabase.from('user_usage').insert({
        user_id: userId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        cim_analyses_count: 0,
        ioi_generations_count: 0,
        loi_generations_count: 0,
      });
    }

    return {
      cim_analyses_used: usage?.cim_analyses_count || 0,
      cim_analyses_limit: tier?.cim_analyses_limit || null,
      ioi_generations_used: usage?.ioi_generations_count || 0,
      ioi_generations_limit: tier?.ioi_generations_limit || null,
      loi_generations_used: usage?.loi_generations_count || 0,
      loi_generations_limit: tier?.loi_generations_limit || null,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      subscription_tier: profile.subscription_tier,
      subscription_status: profile.subscription_status,
    };

  } catch (error) {
    console.error('Error getting current usage:', error);
    return null;
  }
}

export async function canAnalyzeCIM(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getCurrentUsage(userId);
  
  if (!usage) {
    return { allowed: false, reason: 'Unable to check usage limits' };
  }

  // TEMPORARY: skip subscription requirement (revert when re-enabling subscription gate)
  // if (usage.subscription_status !== 'active' && usage.subscription_status !== 'trialing') {
  //   return { allowed: false, reason: 'Subscription is not active. Please update your payment method.' };
  // }

  // If unlimited (null limit), allow
  if (usage.cim_analyses_limit === null) {
    return { allowed: true };
  }

  // Check if under limit
  if (usage.cim_analyses_used >= usage.cim_analyses_limit) {
    return { 
      allowed: false, 
      reason: `You've reached your monthly limit of ${usage.cim_analyses_limit} CIM analyses. Upgrade for unlimited or wait until next month.` 
    };
  }

  return { allowed: true };
}

export async function incrementCIMUsage(userId: string): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get current usage
  const { data: usage } = await supabase
    .from('user_usage')
    .select('cim_analyses_count')
    .eq('user_id', userId)
    .eq('period_start', periodStart.toISOString())
    .single();

  const currentCount = usage?.cim_analyses_count || 0;

  await supabase
    .from('user_usage')
    .update({ 
      cim_analyses_count: currentCount + 1,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('period_start', periodStart.toISOString());
}

export async function canGenerateIOI(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getCurrentUsage(userId);
  
  if (!usage) {
    return { allowed: false, reason: 'Unable to check usage limits' };
  }

  // TEMPORARY: skip subscription requirement (revert when re-enabling subscription gate)
  // if (usage.subscription_status !== 'active' && usage.subscription_status !== 'trialing') {
  //   return { allowed: false, reason: 'Subscription is not active' };
  // }

  if (usage.ioi_generations_limit === null) {
    return { allowed: true };
  }

  if (usage.ioi_generations_used >= usage.ioi_generations_limit) {
    return { 
      allowed: false, 
      reason: `You've reached your monthly limit of ${usage.ioi_generations_limit} IOI generations.` 
    };
  }

  return { allowed: true };
}

export async function incrementIOIUsage(userId: string): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: usage } = await supabase
    .from('user_usage')
    .select('ioi_generations_count')
    .eq('user_id', userId)
    .eq('period_start', periodStart.toISOString())
    .single();

  const currentCount = usage?.ioi_generations_count || 0;

  await supabase
    .from('user_usage')
    .update({ 
      ioi_generations_count: currentCount + 1,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('period_start', periodStart.toISOString());
}

export async function canGenerateLOI(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getCurrentUsage(userId);
  
  if (!usage) {
    return { allowed: false, reason: 'Unable to check usage limits' };
  }

  if (usage.subscription_status !== 'active' && usage.subscription_status !== 'trialing') {
    return { allowed: false, reason: 'Subscription is not active' };
  }

  if (usage.loi_generations_limit === null) {
    return { allowed: true };
  }

  if (usage.loi_generations_used >= usage.loi_generations_limit) {
    return { 
      allowed: false, 
      reason: `You've reached your monthly limit of ${usage.loi_generations_limit} LOI generations.` 
    };
  }

  return { allowed: true };
}

export async function incrementLOIUsage(userId: string): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: usage } = await supabase
    .from('user_usage')
    .select('loi_generations_count')
    .eq('user_id', userId)
    .eq('period_start', periodStart.toISOString())
    .single();

  const currentCount = usage?.loi_generations_count || 0;

  await supabase
    .from('user_usage')
    .update({ 
      loi_generations_count: currentCount + 1,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('period_start', periodStart.toISOString());
}
