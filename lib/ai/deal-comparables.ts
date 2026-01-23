import { createClient } from '@/lib/supabase/server';
import type { Deal } from '@/lib/types/deal';

/**
 * Finds comparable deals based on similar characteristics
 */
export async function findComparableDeals(
  deal: Deal,
  workspaceId: string,
  limit: number = 5
): Promise<Deal[]> {
  const supabase = await createClient();
  
  // Extract revenue from deal
  const revenue = deal.ai_financials_json?.revenue?.[0]?.value;
  const revenueNum = revenue 
    ? parseFloat(revenue.toString().replace(/[^0-9.]/g, ''))
    : null;
  
  // Build query
  let query = supabase
    .from('companies')
    .select('*')
    .eq('workspace_id', workspaceId)
    .neq('id', deal.id)
    .is('archived_at', null);
  
  // Filter by industry if available
  if (deal.industry) {
    query = query.eq('industry', deal.industry);
  }
  
  // Prefer deals with outcomes (closed or passed) for learning
  query = query.not('outcome', 'is', null);
  
  // Order by score (higher is better)
  query = query.order('score', { ascending: false, nullsFirst: false });
  
  const { data: comparables, error } = await query.limit(limit * 2); // Get more to filter by revenue
  
  if (error) {
    console.error('Error finding comparable deals:', error);
    return [];
  }
  
  // Filter by revenue range if available (±30%)
  let filtered = comparables || [];
  if (revenueNum && revenueNum > 0 && comparables) {
    const revenueLow = revenueNum * 0.7;
    const revenueHigh = revenueNum * 1.3;
    
    filtered = comparables.filter(d => {
      const dealRev = d.ai_financials_json?.revenue?.[0]?.value;
      if (!dealRev) return true; // Keep deals without revenue data
      const numRev = parseFloat(dealRev.toString().replace(/[^0-9.]/g, ''));
      return numRev >= revenueLow && numRev <= revenueHigh;
    });
  }
  
  // If we don't have enough with outcomes, fill with active deals
  if (filtered.length < limit) {
    const remaining = limit - filtered.length;
    
    let fillQuery = supabase
      .from('companies')
      .select('*')
      .eq('workspace_id', workspaceId)
      .neq('id', deal.id)
      .is('archived_at', null)
      .is('outcome', null);
    
    if (deal.industry) {
      fillQuery = fillQuery.eq('industry', deal.industry);
    }
    
    const { data: activeDeals } = await fillQuery
      .order('score', { ascending: false, nullsFirst: false })
      .limit(remaining);
    
    return [...filtered, ...(activeDeals || [])].slice(0, limit);
  }
  
  return filtered.slice(0, limit);
}

/**
 * Calculates similarity score between two deals
 */
export function calculateDealSimilarity(deal1: Deal, deal2: Deal): number {
  let similarity = 0;
  let factors = 0;
  
  // Industry match (40% weight)
  if (deal1.industry && deal2.industry) {
    if (deal1.industry === deal2.industry) {
      similarity += 0.4;
    }
    factors += 0.4;
  }
  
  // Revenue similarity (30% weight)
  const rev1 = deal1.ai_financials_json?.revenue?.[0]?.value;
  const rev2 = deal2.ai_financials_json?.revenue?.[0]?.value;
  if (rev1 && rev2) {
    const num1 = parseFloat(rev1.toString().replace(/[^0-9.]/g, ''));
    const num2 = parseFloat(rev2.toString().replace(/[^0-9.]/g, ''));
    if (num1 > 0 && num2 > 0) {
      const ratio = Math.min(num1, num2) / Math.max(num1, num2);
      similarity += 0.3 * ratio;
    }
    factors += 0.3;
  }
  
  // Geography match (15% weight)
  if (deal1.location_state && deal2.location_state) {
    if (deal1.location_state === deal2.location_state) {
      similarity += 0.15;
    }
    factors += 0.15;
  }
  
  // SBA eligibility match (15% weight)
  if (deal1.sba_eligible !== null && deal2.sba_eligible !== null) {
    if (deal1.sba_eligible === deal2.sba_eligible) {
      similarity += 0.15;
    }
    factors += 0.15;
  }
  
  // Normalize by factors available
  return factors > 0 ? similarity / factors : 0;
}
