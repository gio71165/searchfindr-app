import type { Deal } from '@/lib/types/deal';

/**
 * Helper to flip red flag to positive characteristic
 */
function getOppositeCharacteristic(redFlag: string): string {
  const opposites: Record<string, string> = {
    'customer concentration': 'diversified customer base (no customer >15%)',
    'owner dependency': 'strong management team in place',
    'declining revenue': 'consistent revenue growth',
    'low margins': 'healthy margins (>15% EBITDA)',
    'too expensive': 'better valuation alignment',
    'wrong valuation': 'better valuation alignment',
    'customer concentration too high': 'diversified customer base (no customer >15%)',
    'owner not really retiring': 'clear succession plan',
    'succession unclear': 'clear succession plan',
    'industry declining': 'stable or growing industry',
    'industry unattractive': 'more attractive industry profile',
    'location - would require relocation': 'better geographic fit',
    'deal too small': 'larger deal size',
    'deal too large': 'smaller, more manageable deal size',
    'not sba eligible': 'SBA-eligible opportunities',
    'insufficient information': 'more complete information package',
    'poor cim quality': 'higher quality CIM',
    'financial irregularities': 'clean financials',
    'qoe concerns': 'strong quality of earnings',
    'technology/operational obsolescence': 'modern technology and operations',
    'competitive position weak': 'strong competitive position',
    'growth concerns': 'positive growth trajectory',
    'management team issues': 'strong management team',
    'legal/regulatory concerns': 'clean legal and regulatory profile',
  };

  // Try exact match first
  if (redFlag.toLowerCase() in opposites) {
    return opposites[redFlag.toLowerCase()];
  }

  // Try partial matches
  const lowerFlag = redFlag.toLowerCase();
  for (const [key, value] of Object.entries(opposites)) {
    if (lowerFlag.includes(key) || key.includes(lowerFlag)) {
      return value;
    }
  }

  return 'stronger fundamentals';
}

/**
 * Extracts primary red flag from deal data
 */
function getPrimaryRedFlag(deal: Deal, passReason?: string | null): string {
  // If pass reason is provided, use it
  if (passReason) {
    return passReason;
  }

  // Try to extract from AI red flags
  // Note: Deal type has ai_red_flags as string | null, but DealAnalysis has string | string[]
  // Handle both cases for safety
  if (deal.ai_red_flags) {
    if (typeof deal.ai_red_flags === 'string') {
      const flags = deal.ai_red_flags.split(',').map(f => f.trim()).filter(f => f.length > 0);
      if (flags.length > 0) {
        return flags[0];
      }
    } else if (Array.isArray(deal.ai_red_flags)) {
      // Type assertion needed because Deal type says string | null, but runtime could be array
      const flagsArray = deal.ai_red_flags as unknown as string[];
      const validFlags = flagsArray.filter((f: string) => typeof f === 'string' && f.length > 0);
      if (validFlags.length > 0) {
        return validFlags[0];
      }
    }
  }

  // Try to extract from analysis
  if (deal.criteria_match_json?.primary_reason) {
    return deal.criteria_match_json.primary_reason;
  }

  // Default fallback
  return 'fit with current search criteria';
}

/**
 * Gets broker name from deal
 */
async function getBrokerName(
  supabase: any,
  workspaceId: string,
  brokerId: string | null | undefined
): Promise<string> {
  if (!brokerId) {
    return '[Broker Name]';
  }

  try {
    const { data, error } = await supabase
      .from('brokers')
      .select('name')
      .eq('id', brokerId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) {
      return '[Broker Name]';
    }

    return data.name || '[Broker Name]';
  } catch (error) {
    console.error('Error fetching broker name:', error);
    return '[Broker Name]';
  }
}

/**
 * Gets template for specific pass reason types
 */
function getPassReasonTemplate(passReason: string): string | null {
  const lowerReason = passReason.toLowerCase();
  
  // Too expensive / valuation
  if (lowerReason.includes('expensive') || lowerReason.includes('valuation') || lowerReason.includes('price') || lowerReason.includes('multiple')) {
    return 'too_expensive';
  }
  
  // Geography
  if (lowerReason.includes('geography') || lowerReason.includes('location') || lowerReason.includes('relocation')) {
    return 'geography';
  }
  
  // Customer concentration
  if (lowerReason.includes('customer concentration') || lowerReason.includes('concentration') || lowerReason.includes('single customer')) {
    return 'customer_concentration';
  }
  
  // Deal size
  if (lowerReason.includes('too small') || lowerReason.includes('too large') || lowerReason.includes('deal size')) {
    return 'deal_size';
  }
  
  // Industry fit
  if (lowerReason.includes('industry') || lowerReason.includes('sector')) {
    return 'industry_fit';
  }
  
  return null;
}

/**
 * Generates a personalized broker feedback note with templates
 * @param deal - The deal being passed
 * @param passReason - The reason for passing (optional, will be extracted from deal if not provided)
 * @param brokerName - The broker's name (optional, will be fetched if not provided)
 * @returns A professional feedback note
 */
export async function generateBrokerFeedback(
  deal: Deal,
  passReason?: string | null,
  brokerName?: string | null
): Promise<string> {
  const primaryRedFlag = getPrimaryRedFlag(deal, passReason);
  const oppositeCharacteristic = getOppositeCharacteristic(primaryRedFlag);
  const companyName = deal.company_name || 'this opportunity';
  const industry = deal.industry || 'this industry';
  const broker = brokerName || '[Broker Name]';
  
  const templateType = passReason ? getPassReasonTemplate(passReason) : null;
  
  // Use template if available, otherwise use generic
  let note = '';
  
  if (templateType === 'too_expensive') {
    note = `Hi ${broker},

Thanks for sending over ${companyName}. After careful review, we're passing primarily due to valuation - the asking price doesn't align with our investment criteria for businesses of this profile.

We're focused on deals where we can achieve our target returns while maintaining appropriate risk-adjusted multiples. If you come across similar opportunities in ${industry} with more attractive valuations (typically 3-4x normalized EBITDA for this sector), I'd love to see them first.

Best,
[Your Name]`;
  } else if (templateType === 'geography') {
    const geographyReason = primaryRedFlag.includes('location') ? primaryRedFlag : 'the location does not fit our target markets';
    note = `Hi ${broker},

Thanks for sending over ${companyName}. After review, we're passing primarily due to geography - ${geographyReason}.

We're focused on opportunities in our core geographic markets. If you come across similar businesses in ${industry} located in [Your Target Markets], I'd love to see them first.

Best,
[Your Name]`;
  } else if (templateType === 'customer_concentration') {
    const concentrationReason = primaryRedFlag.includes('customer') ? primaryRedFlag : 'the customer concentration exceeds our risk tolerance';
    note = `Hi ${broker},

Thanks for sending over ${companyName}. After review, we're passing primarily due to customer concentration - ${concentrationReason}.

For search fund buyers relying on SBA financing, customer concentration >50% makes deals ineligible. We're looking for businesses with diversified customer bases (no single customer >20%, top 3 customers <50%). If you come across opportunities in ${industry} with ${oppositeCharacteristic}, I'd love to see them first.

Best,
[Your Name]`;
  } else {
    // Generic template
    note = `Hi ${broker},

Thanks for sending over ${companyName}. After review, we're passing primarily due to ${primaryRedFlag}.

If you come across deals in ${industry} with ${oppositeCharacteristic}, I'd love to see them first.

Best,
[Your Name]`;
  }

  return note;
}

/**
 * Synchronous version that doesn't fetch broker name
 * Use this when broker name is already known or not needed
 */
export function generateBrokerFeedbackSync(
  deal: Deal,
  passReason?: string | null,
  brokerName?: string | null
): string {
  const primaryRedFlag = getPrimaryRedFlag(deal, passReason);
  const oppositeCharacteristic = getOppositeCharacteristic(primaryRedFlag);
  const companyName = deal.company_name || 'this opportunity';
  const industry = deal.industry || 'this industry';
  const broker = brokerName || '[Broker Name]';
  
  const templateType = passReason ? getPassReasonTemplate(passReason) : null;
  
  // Use template if available, otherwise use generic
  let note = '';
  
  if (templateType === 'too_expensive') {
    note = `Hi ${broker},

Thanks for sending over ${companyName}. After careful review, we're passing primarily due to valuation - the asking price doesn't align with our investment criteria for businesses of this profile.

We're focused on deals where we can achieve our target returns while maintaining appropriate risk-adjusted multiples. If you come across similar opportunities in ${industry} with more attractive valuations (typically 3-4x normalized EBITDA for this sector), I'd love to see them first.

Best,
[Your Name]`;
  } else if (templateType === 'geography') {
    const geographyReason = primaryRedFlag.includes('location') ? primaryRedFlag : 'the location does not fit our target markets';
    note = `Hi ${broker},

Thanks for sending over ${companyName}. After review, we're passing primarily due to geography - ${geographyReason}.

We're focused on opportunities in our core geographic markets. If you come across similar businesses in ${industry} located in [Your Target Markets], I'd love to see them first.

Best,
[Your Name]`;
  } else if (templateType === 'customer_concentration') {
    const concentrationReason = primaryRedFlag.includes('customer') ? primaryRedFlag : 'the customer concentration exceeds our risk tolerance';
    note = `Hi ${broker},

Thanks for sending over ${companyName}. After review, we're passing primarily due to customer concentration - ${concentrationReason}.

For search fund buyers relying on SBA financing, customer concentration >50% makes deals ineligible. We're looking for businesses with diversified customer bases (no single customer >20%, top 3 customers <50%). If you come across opportunities in ${industry} with ${oppositeCharacteristic}, I'd love to see them first.

Best,
[Your Name]`;
  } else {
    // Generic template
    note = `Hi ${broker},

Thanks for sending over ${companyName}. After review, we're passing primarily due to ${primaryRedFlag}.

If you come across deals in ${industry} with ${oppositeCharacteristic}, I'd love to see them first.

Best,
[Your Name]`;
  }

  return note;
}
