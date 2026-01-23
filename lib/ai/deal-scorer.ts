import { createClient } from '@/lib/supabase/server';
import type { Deal } from '@/lib/types/deal';

export interface DealScoreComponents {
  financialQuality: number; // 0-1 based on margin, growth
  revenueStability: number; // 0-1 based on variance
  customerConcentration: number; // 0-1 (lower is better, so inverted)
  ownerDependence: number; // 0-1 (lower is better, so inverted)
  industryFit: number; // 0-1 based on searcher's target
  geographyFit: number; // 0-1 based on searcher's location
  sbaEligibility: number; // 0-1 binary
  reasonableValuation: number; // 0-1 based on multiple vs. industry
}

export interface DealScoreWeights {
  financialQuality: number;
  revenueStability: number;
  customerConcentration: number;
  ownerDependence: number;
  industryFit: number;
  geographyFit: number;
  sbaEligibility: number;
  reasonableValuation: number;
}

export interface DealScoreResult {
  tier: 'A' | 'B' | 'C'; // A/B/C tier matching system-wide convention
  score: number; // 0-100 (internal, for learning)
  confidence: number; // 0-1
  breakdown: Record<string, number>;
  components: DealScoreComponents;
}

// Initial weights (will be learned over time)
const DEFAULT_WEIGHTS: DealScoreWeights = {
  financialQuality: 0.25,
  revenueStability: 0.20,
  customerConcentration: 0.15,
  ownerDependence: 0.10,
  industryFit: 0.10,
  geographyFit: 0.05,
  sbaEligibility: 0.10,
  reasonableValuation: 0.05,
};

/**
 * Extracts score components from a deal's data
 */
export function extractScoreComponents(deal: Deal): Partial<DealScoreComponents> {
  const components: Partial<DealScoreComponents> = {};
  
  // Financial Quality (based on EBITDA margin, growth)
  if (deal.ai_financials_json) {
    const revenue = deal.ai_financials_json.revenue?.[0]?.value;
    const ebitda = deal.ai_financials_json.ebitda?.[0]?.value;
    
    if (revenue && ebitda) {
      const margin = parseFloat(ebitda.toString().replace(/[^0-9.]/g, '')) / 
                     parseFloat(revenue.toString().replace(/[^0-9.]/g, ''));
      // Higher margin = better (normalize to 0-1, assuming 0-30% margin range)
      components.financialQuality = Math.min(1, Math.max(0, margin / 0.30));
    }
  }
  
  // Revenue Stability (placeholder - would need historical data)
  // For now, use confidence as proxy
  if (deal.ai_confidence_json?.level) {
    const confMap: Record<string, number> = {
      'A': 0.9,
      'B': 0.6,
      'C': 0.3,
    };
    components.revenueStability = confMap[deal.ai_confidence_json.level] || 0.5;
  }
  
  // Customer Concentration (from red flags or financials)
  // Lower concentration = better, so we invert
  if (deal.ai_red_flags?.toLowerCase().includes('customer concentration')) {
    components.customerConcentration = 0.3; // Bad = low score
  } else {
    components.customerConcentration = 0.8; // Good = high score
  }
  
  // Owner Dependence (from red flags)
  if (deal.ai_red_flags?.toLowerCase().includes('owner') || 
      deal.ai_red_flags?.toLowerCase().includes('founder')) {
    components.ownerDependence = 0.4; // Bad = low score
  } else {
    components.ownerDependence = 0.8; // Good = high score
  }
  
  // Industry Fit (placeholder - would need searcher preferences)
  components.industryFit = 0.7; // Default moderate fit
  
  // Geography Fit (placeholder - would need searcher location)
  components.geographyFit = 0.7; // Default moderate fit
  
  // SBA Eligibility
  components.sbaEligibility = deal.sba_eligible ? 1.0 : 0.0;
  
  // Reasonable Valuation (placeholder - would need industry multiples)
  // For now, use tier as proxy
  if (deal.final_tier === 'A') {
    components.reasonableValuation = 0.9;
  } else if (deal.final_tier === 'B') {
    components.reasonableValuation = 0.6;
  } else {
    components.reasonableValuation = 0.3;
  }
  
  return components;
}

/**
 * Calculates deal score from components and weights
 */
export function calculateDealScore(
  components: Partial<DealScoreComponents>,
  weights: DealScoreWeights = DEFAULT_WEIGHTS
): DealScoreResult {
  // Fill missing components with 0
  const fullComponents: DealScoreComponents = {
    financialQuality: components.financialQuality ?? 0,
    revenueStability: components.revenueStability ?? 0,
    customerConcentration: components.customerConcentration ?? 0,
    ownerDependence: components.ownerDependence ?? 0,
    industryFit: components.industryFit ?? 0,
    geographyFit: components.geographyFit ?? 0,
    sbaEligibility: components.sbaEligibility ?? 0,
    reasonableValuation: components.reasonableValuation ?? 0,
  };
  
  const weightedScores: Record<string, number> = {};
  let totalScore = 0;
  let totalWeight = 0;
  
  Object.entries(fullComponents).forEach(([key, value]) => {
    const weight = weights[key as keyof DealScoreWeights] || 0;
    const weighted = value * weight;
    weightedScores[key] = weighted;
    totalScore += weighted;
    totalWeight += weight;
  });
  
  // Normalize to 0-100 scale (internal for learning)
  const score = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  
  // Convert to A/B/C tier (matching system-wide convention)
  // A = 70+, B = 40-69, C = <40 (matching normalizeLMH logic)
  let tier: 'A' | 'B' | 'C';
  if (score >= 70) {
    tier = 'A';
  } else if (score >= 40) {
    tier = 'B';
  } else {
    tier = 'C';
  }
  
  // Confidence based on data completeness
  const completeness = Object.values(fullComponents).filter(v => v > 0).length / 
                       Object.keys(fullComponents).length;
  
  // Calculate breakdown (contribution of each component to final score)
  const breakdown: Record<string, number> = {};
  Object.entries(weightedScores).forEach(([key, value]) => {
    breakdown[key] = (value / totalWeight) * 100;
  });
  
  return {
    tier,
    score: Math.round(score),
    confidence: Math.round(completeness * 100) / 100,
    breakdown,
    components: fullComponents,
  };
}

/**
 * Calculates average component scores from deals
 */
function calculateAverageComponents(
  deals: Array<{ score_components: any }>
): Partial<DealScoreComponents> {
  if (deals.length === 0) {
    return {};
  }
  
  const totals: Partial<Record<keyof DealScoreComponents, number>> = {};
  let count = 0;
  
  deals.forEach(deal => {
    if (deal.score_components) {
      const comps = deal.score_components as Partial<DealScoreComponents>;
      Object.keys(comps).forEach(key => {
        const k = key as keyof DealScoreComponents;
        totals[k] = (totals[k] || 0) + (comps[k] || 0);
      });
      count++;
    }
  });
  
  const averages: Partial<DealScoreComponents> = {};
  Object.keys(totals).forEach(key => {
    const k = key as keyof DealScoreComponents;
    averages[k] = totals[k]! / count;
  });
  
  return averages;
}

/**
 * Learns from outcomes and updates weights
 * Should be run periodically as a cron job
 */
export async function updateWeightsFromOutcomes(
  workspaceId?: string
): Promise<DealScoreWeights> {
  const supabase = await createClient();
  
  // Fetch deals with outcomes
  let query = supabase
    .from('companies')
    .select('score_components, outcome')
    .not('outcome', 'is', null)
    .not('score_components', 'is', null);
  
  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }
  
  const { data: deals, error } = await query;
  
  if (error) {
    console.error('Error fetching deals for training:', error);
    return DEFAULT_WEIGHTS;
  }
  
  if (!deals || deals.length < 50) {
    console.log(`Not enough outcome data to retrain model (${deals?.length || 0} deals, need 50+)`);
    return DEFAULT_WEIGHTS;
  }
  
  // Separate by outcome
  const closedDeals = deals.filter(d => d.outcome === 'closed');
  const passedDeals = deals.filter(d => d.outcome === 'passed');
  const lostDeals = deals.filter(d => d.outcome === 'lost');
  
  if (closedDeals.length === 0 || (passedDeals.length === 0 && lostDeals.length === 0)) {
    console.log('Not enough outcome diversity to retrain model');
    return DEFAULT_WEIGHTS;
  }
  
  // Calculate average component scores for each outcome
  const avgClosed = calculateAverageComponents(closedDeals);
  const avgNegative = calculateAverageComponents([...passedDeals, ...lostDeals]);
  
  // Adjust weights based on which components differ most
  // Components that are higher in closed deals should get higher weights
  const newWeights: DealScoreWeights = { ...DEFAULT_WEIGHTS };
  
  Object.keys(DEFAULT_WEIGHTS).forEach(key => {
    const k = key as keyof DealScoreWeights;
    const closedAvg = avgClosed[k] || 0;
    const negativeAvg = avgNegative[k] || 0;
    
    // Calculate difference (how much better closed deals are)
    const diff = closedAvg - negativeAvg;
    
    // Increase weight for components with larger positive differences
    // (components that correlate with closed outcomes)
    if (diff > 0) {
      newWeights[k] = DEFAULT_WEIGHTS[k] * (1 + diff * 0.5);
    } else {
      // Decrease weight for components that don't correlate
      newWeights[k] = DEFAULT_WEIGHTS[k] * (1 + diff * 0.3);
    }
  });
  
  // Normalize weights to sum to 1
  const totalWeight = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
  Object.keys(newWeights).forEach(key => {
    const k = key as keyof DealScoreWeights;
    newWeights[k] = newWeights[k] / totalWeight;
  });
  
  // Save updated weights to database
  const { error: saveError } = await supabase
    .from('deal_scoring_weights')
    .insert({
      workspace_id: workspaceId || null,
      weights: newWeights,
      training_sample_size: deals.length,
      performance_metrics: {
        closed_count: closedDeals.length,
        passed_count: passedDeals.length,
        lost_count: lostDeals.length,
      },
    });
  
  if (saveError) {
    console.error('Error saving updated weights:', saveError);
  } else {
    // Deactivate old weights
    await supabase
      .from('deal_scoring_weights')
      .update({ is_active: false })
      .eq('workspace_id', workspaceId || null)
      .neq('id', (await supabase.from('deal_scoring_weights').select('id').order('created_at', { ascending: false }).limit(1).single()).data?.id || '');
  }
  
  return newWeights;
}

/**
 * Gets active weights for a workspace (or global if none)
 */
export async function getActiveWeights(workspaceId?: string): Promise<DealScoreWeights> {
  const supabase = await createClient();
  
  // Try to get workspace-specific weights first
  if (workspaceId) {
    const { data: workspaceWeights } = await supabase
      .from('deal_scoring_weights')
      .select('weights')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (workspaceWeights?.weights) {
      return workspaceWeights.weights as DealScoreWeights;
    }
  }
  
  // Fall back to global weights
  const { data: globalWeights } = await supabase
    .from('deal_scoring_weights')
    .select('weights')
    .is('workspace_id', null)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (globalWeights?.weights) {
    return globalWeights.weights as DealScoreWeights;
  }
  
  // Return defaults if no weights found
  return DEFAULT_WEIGHTS;
}

/**
 * Calculates and saves score for a deal
 */
export async function calculateAndSaveDealScore(
  deal: Deal,
  workspaceId: string
): Promise<DealScoreResult> {
  const components = extractScoreComponents(deal);
  const weights = await getActiveWeights(workspaceId);
  const scoreResult = calculateDealScore(components, weights);
  
  // Save to database (update final_tier and score_components)
  const supabase = await createClient();
  await supabase
    .from('companies')
    .update({
      final_tier: scoreResult.tier,
      score: scoreResult.score, // Keep numeric score for learning
      score_components: components,
    })
    .eq('id', deal.id);
  
  return scoreResult;
}
