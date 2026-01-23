import type { Deal } from '@/lib/types/deal';
import type { SearchCriteria } from '@/lib/types/search-criteria';

export interface CriteriaMatchResult {
  matches: boolean;
  failedCriteria: string[];
}

/**
 * Checks if a deal matches the given search criteria
 */
export function dealMatchesCriteria(deal: Deal, criteria: SearchCriteria): CriteriaMatchResult {
  const failed: string[] = [];
  
  // Extract financial data from deal
  const fin = deal.ai_financials_json || {};
  const finAny = fin as Record<string, unknown>;
  
  // Get revenue value (try multiple field names)
  const revenueValue = fin.revenue || finAny.ttm_revenue || finAny.revenue_ttm || finAny.latest_revenue;
  const revenue = Array.isArray(revenueValue) && revenueValue.length > 0
    ? parseFloat(String(revenueValue[revenueValue.length - 1]?.value || 0).replace(/[^0-9.]/g, ''))
    : typeof revenueValue === 'number'
      ? revenueValue
      : typeof revenueValue === 'string'
        ? parseFloat(revenueValue.replace(/[^0-9.]/g, '')) || 0
        : deal.ebitda_ttm_extracted
          ? parseFloat(String(deal.ebitda_ttm_extracted).replace(/[^0-9.]/g, '')) * 10 // rough estimate if only EBITDA
          : 0;
  
  // Get EBITDA value
  const ebitdaValue = fin.ebitda || finAny.ttm_ebitda || finAny.ebitda_ttm || finAny.latest_ebitda;
  const ebitda = Array.isArray(ebitdaValue) && ebitdaValue.length > 0
    ? parseFloat(String(ebitdaValue[ebitdaValue.length - 1]?.value || 0).replace(/[^0-9.]/g, ''))
    : typeof ebitdaValue === 'number'
      ? ebitdaValue
      : typeof ebitdaValue === 'string'
        ? parseFloat(ebitdaValue.replace(/[^0-9.]/g, '')) || 0
        : deal.ebitda_ttm_extracted
          ? parseFloat(String(deal.ebitda_ttm_extracted).replace(/[^0-9.]/g, '')) || 0
          : 0;
  
  // Get asking price
  const askingPriceStr = deal.asking_price_extracted || '';
  const askingPrice = askingPriceStr ? parseFloat(askingPriceStr.replace(/[^0-9.]/g, '')) || 0 : 0;
  
  // Revenue check
  if (criteria.revenue_min && revenue > 0 && revenue < criteria.revenue_min) {
    failed.push(`Revenue below minimum ($${criteria.revenue_min.toLocaleString()})`);
  }
  if (criteria.revenue_max && revenue > criteria.revenue_max) {
    failed.push(`Revenue above maximum ($${criteria.revenue_max.toLocaleString()})`);
  }
  
  // EBITDA check
  if (criteria.ebitda_min && ebitda > 0 && ebitda < criteria.ebitda_min) {
    failed.push(`EBITDA below minimum ($${criteria.ebitda_min.toLocaleString()})`);
  }
  if (criteria.ebitda_max && ebitda > criteria.ebitda_max) {
    failed.push(`EBITDA above maximum ($${criteria.ebitda_max.toLocaleString()})`);
  }
  
  // Margin check
  if (criteria.margin_min && revenue > 0 && ebitda > 0) {
    const margin = (ebitda / revenue) * 100;
    if (margin < criteria.margin_min) {
      failed.push(`EBITDA margin below ${criteria.margin_min}% (actual: ${margin.toFixed(1)}%)`);
    }
  }
  
  // Geography check
  const dealState = deal.location_state || '';
  if (criteria.states && criteria.states.length > 0 && dealState) {
    if (!criteria.states.includes(dealState)) {
      failed.push(`State ${dealState} not in target states`);
    }
  }
  
  if (criteria.exclude_states && criteria.exclude_states.length > 0 && dealState) {
    if (criteria.exclude_states.includes(dealState)) {
      failed.push(`State ${dealState} is excluded`);
    }
  }
  
  // Industry check
  const dealIndustry = deal.industry || '';
  if (criteria.industries && criteria.industries.length > 0 && dealIndustry) {
    if (!criteria.industries.includes(dealIndustry)) {
      failed.push(`Industry "${dealIndustry}" not in target industries`);
    }
  }
  
  if (criteria.exclude_industries && criteria.exclude_industries.length > 0 && dealIndustry) {
    if (criteria.exclude_industries.includes(dealIndustry)) {
      failed.push(`Industry "${dealIndustry}" is excluded`);
    }
  }
  
  // Asking price check
  if (criteria.asking_price_max && askingPrice > 0 && askingPrice > criteria.asking_price_max) {
    failed.push(`Asking price above maximum ($${criteria.asking_price_max.toLocaleString()})`);
  }
  
  // Multiple check (EBITDA multiple)
  if (criteria.multiple_max && ebitda > 0 && askingPrice > 0) {
    const multiple = askingPrice / ebitda;
    if (multiple > criteria.multiple_max) {
      failed.push(`Multiple above maximum (${criteria.multiple_max}x, actual: ${multiple.toFixed(1)}x)`);
    }
  }
  
  // SBA eligibility
  if (criteria.sba_eligible_only && !deal.sba_eligible) {
    failed.push('Not SBA eligible');
  }
  
  // Customer concentration check
  if (criteria.customer_concentration_max) {
    const customerConc = fin.customer_concentration;
    if (customerConc) {
      // Try to extract percentage from string like "Top customer: 25%"
      const concMatch = String(customerConc).match(/(\d+(?:\.\d+)?)%/);
      if (concMatch) {
        const concPercent = parseFloat(concMatch[1]);
        if (concPercent > criteria.customer_concentration_max) {
          failed.push(`Customer concentration above maximum (${criteria.customer_concentration_max}%, actual: ${concPercent}%)`);
        }
      }
    }
  }
  
  return {
    matches: failed.length === 0,
    failedCriteria: failed,
  };
}

/**
 * Filters an array of deals based on search criteria
 */
export function filterDealsByCriteria(
  deals: Deal[],
  criteria: SearchCriteria
): { matching: Deal[]; nonMatching: Array<{ deal: Deal; failedCriteria: string[] }> } {
  const matching: Deal[] = [];
  const nonMatching: Array<{ deal: Deal; failedCriteria: string[] }> = [];
  
  for (const deal of deals) {
    const result = dealMatchesCriteria(deal, criteria);
    if (result.matches) {
      matching.push(deal);
    } else {
      nonMatching.push({ deal, failedCriteria: result.failedCriteria });
    }
  }
  
  return { matching, nonMatching };
}
