import { SBA7aInputs, SBA7aOutputs } from '@/lib/types/sba';
import { calculateSBA7a } from './sba-calculator';

export interface ScenarioAssumptions {
  revenueChangePercent: number; // e.g., -20 for 20% decline
  ebitdaMarginChange: number; // e.g., -5 for 5-point compression
  interestRateChange: number; // e.g., +2 for 2% rate increase
  topCustomerLoss: boolean; // simulate losing largest customer
  topCustomerRevenuePercent?: number; // if topCustomerLoss = true
}

export interface Scenario {
  name: string;
  description: string;
  assumptions: ScenarioAssumptions;
  adjustedEBITDA: number;
  adjustedRevenue: number;
  outputs: SBA7aOutputs;
  viabilityScore: 'viable' | 'marginal' | 'unviable';
  riskFactors: string[];
}

export function buildScenarios(
  baseInputs: SBA7aInputs,
  baseRevenue: number,
  topCustomerPercent: number = 0
): {
  baseCase: Scenario;
  upside: Scenario;
  downside: Scenario;
  worstCase: Scenario;
  breakeven: { ebitdaRequired: number; marginOfSafety: number };
} {
  // Base case
  const baseCase: Scenario = {
    name: 'Base Case',
    description: 'As presented in CIM',
    assumptions: {
      revenueChangePercent: 0,
      ebitdaMarginChange: 0,
      interestRateChange: 0,
      topCustomerLoss: false,
    },
    adjustedEBITDA: baseInputs.ebitda,
    adjustedRevenue: baseRevenue,
    outputs: calculateSBA7a(baseInputs),
    viabilityScore: 'viable',
    riskFactors: [],
  };
  
  // Upside case (+20% revenue, margin expansion)
  const upsideRevenue = baseRevenue * 1.20;
  const baseMargin = baseRevenue > 0 ? (baseInputs.ebitda / baseRevenue) : 0;
  const upsideMargin = baseMargin + 0.05; // +5 points
  const upsideEBITDA = upsideRevenue * Math.max(upsideMargin, 0);
  
  const upsideInputs: SBA7aInputs = {
    ...baseInputs,
    ebitda: upsideEBITDA,
    revenue: upsideRevenue,
    interestRate: baseInputs.interestRate, // keep same rate for upside
  };
  
  const upside: Scenario = {
    name: 'Upside Case',
    description: '+20% revenue growth, +5pt margin expansion',
    assumptions: {
      revenueChangePercent: 20,
      ebitdaMarginChange: 5,
      interestRateChange: 0,
      topCustomerLoss: false,
    },
    adjustedEBITDA: upsideEBITDA,
    adjustedRevenue: upsideRevenue,
    outputs: calculateSBA7a(upsideInputs),
    viabilityScore: 'viable',
    riskFactors: [],
  };
  
  // Downside case (-20% revenue)
  const downsideRevenue = baseRevenue * 0.80;
  const downsideMargin = baseMargin; // same margin
  const downsideEBITDA = downsideRevenue * Math.max(downsideMargin, 0);
  
  const downsideInputs: SBA7aInputs = {
    ...baseInputs,
    ebitda: downsideEBITDA,
    revenue: downsideRevenue,
  };
  
  const downsideOutputs = calculateSBA7a(downsideInputs);
  
  const downsideViability: 'viable' | 'marginal' | 'unviable' = 
    downsideOutputs.dscr >= 1.25 ? 'viable' :
    downsideOutputs.dscr >= 1.15 ? 'marginal' :
    'unviable';
  
  const downside: Scenario = {
    name: 'Downside Case',
    description: '-20% revenue decline, margins hold',
    assumptions: {
      revenueChangePercent: -20,
      ebitdaMarginChange: 0,
      interestRateChange: 0,
      topCustomerLoss: false,
    },
    adjustedEBITDA: downsideEBITDA,
    adjustedRevenue: downsideRevenue,
    outputs: downsideOutputs,
    viabilityScore: downsideViability,
    riskFactors: downsideOutputs.dscr < 1.15 
      ? ['DSCR falls below SBA minimum']
      : downsideOutputs.dscr < 1.25
        ? ['DSCR below preferred threshold (1.25x)']
        : [],
  };
  
  // Worst case (top customer loss + margin compression)
  const worstRevenue = baseRevenue * (1 - topCustomerPercent / 100);
  const worstMargin = Math.max(baseMargin - 0.05, 0); // -5 points, but not negative
  const worstEBITDA = worstRevenue * worstMargin;
  
  const worstInputs: SBA7aInputs = {
    ...baseInputs,
    ebitda: worstEBITDA,
    revenue: worstRevenue,
  };
  
  const worstOutputs = calculateSBA7a(worstInputs);
  
  const worstViability: 'viable' | 'marginal' | 'unviable' = 
    worstOutputs.dscr >= 1.25 ? 'viable' :
    worstOutputs.dscr >= 1.15 ? 'marginal' :
    'unviable';
  
  const worstCase: Scenario = {
    name: 'Worst Case',
    description: `Top customer (${topCustomerPercent}%) lost + 5pt margin compression`,
    assumptions: {
      revenueChangePercent: -(topCustomerPercent),
      ebitdaMarginChange: -5,
      interestRateChange: 0,
      topCustomerLoss: true,
      topCustomerRevenuePercent: topCustomerPercent,
    },
    adjustedEBITDA: worstEBITDA,
    adjustedRevenue: worstRevenue,
    outputs: worstOutputs,
    viabilityScore: worstViability,
    riskFactors: [
      'Loss of largest customer',
      'Operating margin compression',
      worstOutputs.dscr < 1.15 ? 'DSCR falls below SBA minimum' : '',
      worstOutputs.dscr < 1.25 && worstOutputs.dscr >= 1.15 ? 'DSCR below preferred threshold' : '',
    ].filter(Boolean) as string[],
  };
  
  // Breakeven analysis
  // What EBITDA is needed to maintain DSCR = 1.25?
  const targetDSCR = 1.25;
  const annualDebtService = baseCase.outputs.annualDebtService;
  const ebitdaRequired = annualDebtService * targetDSCR;
  const marginOfSafety = baseInputs.ebitda > 0 
    ? ((baseInputs.ebitda - ebitdaRequired) / baseInputs.ebitda) * 100
    : 0;
  
  return {
    baseCase,
    upside,
    downside,
    worstCase,
    breakeven: {
      ebitdaRequired,
      marginOfSafety,
    },
  };
}
