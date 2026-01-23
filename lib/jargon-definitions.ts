/**
 * Industry jargon definitions for tooltips throughout the app
 */
export const JARGON_DEFINITIONS: Record<string, string> = {
  'QoE': 'Quality of Earnings: An independent audit of financial accuracy and sustainability',
  'DSCR': 'Debt Service Coverage Ratio: Cash flow divided by debt payments. 1.25x+ is healthy.',
  'IOI': 'Indication of Interest: Non-binding letter expressing intent to purchase',
  'LOI': 'Letter of Intent: Semi-binding agreement outlining key deal terms',
  'CIM': 'Confidential Information Memorandum: Detailed sales document from seller/broker',
  'EBITDA': 'Earnings Before Interest, Taxes, Depreciation & Amortization',
  'SBA 7(a)': 'Small Business Administration loan program for acquisitions up to $5M',
  'SBA': 'Small Business Administration loan program for acquisitions up to $5M',
  'Add-backs': 'Non-recurring expenses added back to calculate true EBITDA',
  'Addbacks': 'Non-recurring expenses added back to calculate true EBITDA',
  'Working Capital': 'Current assets minus current liabilities; cash needed to operate',
  'NAICS': 'North American Industry Classification System: 6-digit industry codes',
  'Seller Note': 'Financing provided by seller, typically subordinate to bank debt',
  'Earnout': 'Purchase price paid over time based on future performance',
  'SDE': 'Seller Discretionary Earnings: Cash flow available to single owner-operator',
};

/**
 * Get definition for a jargon term (case-insensitive)
 */
export function getJargonDefinition(term: string): string | undefined {
  // Try exact match first
  if (JARGON_DEFINITIONS[term]) {
    return JARGON_DEFINITIONS[term];
  }
  
  // Try case-insensitive match
  const lowerTerm = term.toLowerCase();
  for (const [key, value] of Object.entries(JARGON_DEFINITIONS)) {
    if (key.toLowerCase() === lowerTerm) {
      return value;
    }
  }
  
  return undefined;
}

/**
 * Check if a term has a jargon definition
 */
export function hasJargonDefinition(term: string): boolean {
  return getJargonDefinition(term) !== undefined;
}
