export interface WorkingCapitalInputs {
  // Current balance sheet items (from CIM/financials)
  accountsReceivable: number;
  inventory: number;
  prepaidExpenses: number;
  accountsPayable: number;
  accruedExpenses: number;
  
  // Business metrics
  annualRevenue: number;
  industry: string;
  
  // Optional: industry benchmark data
  industryWCPercent?: number; // as % of revenue
}

export interface WorkingCapitalOutputs {
  // Current WC
  currentWorkingCapital: number;
  currentWCAsPercentRevenue: number;
  
  // Normalized/Target WC
  normalizedWorkingCapital: number;
  targetWCAsPercentRevenue: number;
  
  // Adjustment
  estimatedWCAdjustment: number;
  adjustmentDirection: 'buyer_credit' | 'buyer_debit' | 'neutral';
  
  // Analysis
  warnings: string[];
  recommendations: string[];
}

// Industry benchmarks (rough estimates - can be refined)
const INDUSTRY_WC_BENCHMARKS: Record<string, number> = {
  'manufacturing': 0.20, // 20% of revenue
  'distribution': 0.15,
  'professional_services': 0.10,
  'healthcare': 0.12,
  'construction': 0.18,
  'retail': 0.10,
  'technology': 0.08,
  'default': 0.15,
};

export function calculateWorkingCapital(inputs: WorkingCapitalInputs): WorkingCapitalOutputs {
  // Current WC = (AR + Inventory + Prepaid) - (AP + Accrued)
  const currentWorkingCapital = 
    inputs.accountsReceivable + 
    inputs.inventory + 
    inputs.prepaidExpenses - 
    inputs.accountsPayable - 
    inputs.accruedExpenses;
  
  const currentWCAsPercentRevenue = 
    inputs.annualRevenue > 0 
      ? (currentWorkingCapital / inputs.annualRevenue) * 100
      : 0;
  
  // Target WC based on industry
  const targetWCPercent = inputs.industryWCPercent ?? 
    INDUSTRY_WC_BENCHMARKS[inputs.industry.toLowerCase()] ?? 
    INDUSTRY_WC_BENCHMARKS['default'];
  
  const normalizedWorkingCapital = inputs.annualRevenue * targetWCPercent;
  const targetWCAsPercentRevenue = targetWCPercent * 100;
  
  // Adjustment (positive = buyer owes seller, negative = seller owes buyer)
  const estimatedWCAdjustment = normalizedWorkingCapital - currentWorkingCapital;
  
  const adjustmentDirection: 'buyer_credit' | 'buyer_debit' | 'neutral' = 
    estimatedWCAdjustment > 5000 ? 'buyer_debit' :
    estimatedWCAdjustment < -5000 ? 'buyer_credit' :
    'neutral';
  
  // Warnings
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  if (Math.abs(estimatedWCAdjustment) > inputs.annualRevenue * 0.05) {
    warnings.push(
      `Estimated WC adjustment of $${Math.abs(estimatedWCAdjustment).toLocaleString()} ` +
      `is >5% of revenue. Negotiate this carefully in LOI.`
    );
  }
  
  if (currentWCAsPercentRevenue < 5 && inputs.annualRevenue > 0) {
    warnings.push(
      'Current working capital is unusually low. Verify AR/AP aging and inventory valuation.'
    );
  }
  
  if (inputs.accountsReceivable > inputs.annualRevenue * 0.25 && inputs.annualRevenue > 0) {
    warnings.push(
      'Accounts receivable >90 days of revenue. Check AR aging report for collectibility.'
    );
  }
  
  if (inputs.inventory > inputs.annualRevenue * 0.30 && inputs.annualRevenue > 0) {
    warnings.push(
      'Inventory levels appear high relative to revenue. Verify inventory turnover and obsolescence risk.'
    );
  }
  
  recommendations.push(
    'Include WC adjustment mechanism in LOI: "Normalized Working Capital = ' +
    `$${normalizedWorkingCapital.toLocaleString()}, subject to true-up at close"`
  );
  
  recommendations.push(
    'Request detailed AR aging, AP aging, and inventory breakdown during due diligence'
  );
  
  if (estimatedWCAdjustment !== 0) {
    const direction = estimatedWCAdjustment > 0 
      ? 'buyer will owe seller' 
      : 'seller will owe buyer';
    recommendations.push(
      `Estimated adjustment: $${Math.abs(estimatedWCAdjustment).toLocaleString()} ` +
      `(${direction} at close)`
    );
  }
  
  return {
    currentWorkingCapital,
    currentWCAsPercentRevenue,
    normalizedWorkingCapital,
    targetWCAsPercentRevenue,
    estimatedWCAdjustment,
    adjustmentDirection,
    warnings,
    recommendations,
  };
}
