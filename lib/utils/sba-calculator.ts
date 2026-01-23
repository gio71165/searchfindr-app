import { SBA7aInputs, SBA7aOutputs } from '@/lib/types/sba';

// SBA 7(a) Guarantee Fee Structure (2025 rates)
export function calculateSBAGuaranteeFee(loanAmount: number): number {
  if (loanAmount <= 150000) return 0;
  if (loanAmount <= 700000) return loanAmount * 0.02;
  // For loans $700K-$5M: 2% on first $700K, 3.5% on remainder
  const firstTier = 700000 * 0.02;
  const remainder = (loanAmount - 700000) * 0.035;
  return firstTier + remainder;
}

// Normal guarantee fee calculation (used for savings calculation)
function calculateNormalGuaranteeFee(loanAmount: number): number {
  return calculateSBAGuaranteeFee(loanAmount);
}

// Manufacturing detection: NAICS 31-33 = Manufacturing
function isManufacturer(naicsCode: string | null | undefined): boolean {
  if (!naicsCode) return false;
  // NAICS 31-33 = Manufacturing
  return /^3[1-3]/.test(naicsCode);
}

// Check if manufacturing fee waiver is currently active
function isWaiverActive(): boolean {
  const today = new Date();
  const waiverEnd = new Date('2026-09-30');
  return today <= waiverEnd;
}

// Standard amortization formula
function calculateMonthlyPayment(
  loanAmount: number, 
  annualRate: number, 
  years: number
): number {
  if (loanAmount <= 0 || years <= 0) return 0;
  
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  
  if (monthlyRate === 0) return loanAmount / numPayments;
  
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, numPayments);
  const denominator = Math.pow(1 + monthlyRate, numPayments) - 1;
  
  return loanAmount * (numerator / denominator);
}

export function calculateSBA7a(inputs: SBA7aInputs, allInvestorsUSCitizens: boolean = true): SBA7aOutputs {
  // Total project cost
  const totalProjectCost = 
    inputs.purchasePrice + 
    inputs.workingCapital + 
    inputs.closingCosts + 
    inputs.packagingFee;
  
  // Calculate SBA loan structure
  // The guarantee fee can be financed into the loan, but typically the loan amount
  // is calculated to cover project costs. We'll use an iterative approach to solve
  // for the loan amount when the fee is financed.
  
  // Start with base loan amount needed (before fee)
  let sbaLoanBase = totalProjectCost - inputs.sellerNoteAmount - inputs.earnoutAmount;
  
  // Check for manufacturing fee waiver
  const warnings: Array<{
    type: 'bonus' | 'warning' | 'error';
    severity: 'success' | 'info' | 'warning' | 'error';
    message: string;
  }> = [];
  let feeWaiverSavings = 0;
  let sbaGuaranteeFeeAmount = 0;
  
  // Manufacturing fee waiver: $0 guarantee fee for manufacturing businesses (NAICS 31-33)
  // with loans up to $950K, active until Sept 30, 2026
  if (isManufacturer(inputs.naicsCode) && sbaLoanBase <= 950000 && isWaiverActive()) {
    sbaGuaranteeFeeAmount = 0;
    // Calculate what fee WOULD have been
    feeWaiverSavings = calculateNormalGuaranteeFee(sbaLoanBase);
    
    warnings.push({
      type: 'bonus',
      severity: 'success',
      message: `🏭 Manufacturing Fee Waiver Active! $0 SBA guarantee fee (saves $${feeWaiverSavings.toLocaleString()})`
    });
  } else {
    sbaGuaranteeFeeAmount = calculateSBAGuaranteeFee(sbaLoanBase);
  }
  
  let totalSBALoan = sbaLoanBase + sbaGuaranteeFeeAmount;
  
  // If fee is significant, adjust (in practice, fee is usually small enough that one iteration is fine)
  // For accuracy, we could iterate, but for simplicity we'll use the first calculation
  
  // Equity injection is what's left after SBA loan base, seller note, and earnout
  // Note: The guarantee fee being financed means the total loan exceeds the base,
  // but the equity requirement is based on the base loan amount
  const equityInjectionRequired = totalProjectCost - sbaLoanBase - inputs.sellerNoteAmount - inputs.earnoutAmount;
  const equityInjectionPercent = (equityInjectionRequired / totalProjectCost) * 100;
  
  // Monthly payments
  const sbaMonthlyPayment = calculateMonthlyPayment(
    totalSBALoan, 
    inputs.interestRate, 
    inputs.loanTermYears
  );
  
  // Seller note monthly payment (during active period)
  const sellerNoteMonthlyPayment = inputs.sellerNoteAmount > 0
    ? calculateMonthlyPayment(
        inputs.sellerNoteAmount,
        inputs.sellerNoteRate,
        inputs.sellerNoteTermYears
      )
    : 0;
  
  // Total debt service (NOTE: Seller note may be on standby for first 2 years)
  const totalMonthlyDebtService = sbaMonthlyPayment + sellerNoteMonthlyPayment;
  const annualDebtService = totalMonthlyDebtService * 12;
  
  // Key metrics
  const dscr = inputs.ebitda / annualDebtService;
  const yearOneCashFlow = inputs.ebitda - annualDebtService;
  const cashOnCash = (yearOneCashFlow / equityInjectionRequired) * 100;
  const paybackPeriodYears = equityInjectionRequired / yearOneCashFlow;
  
  // SBA eligibility checks
  const sbaEligibilityIssues: string[] = [];
  const sbaEligibilityWarnings: string[] = [];
  
  // Citizenship compliance check
  if (!allInvestorsUSCitizens) {
    sbaEligibilityWarnings.push('⚠️ SBA 7(a) requires 100% U.S. ownership. Your current investor structure may not qualify. Consider conventional financing.');
  }
  
  // Hard stops
  if (sbaLoanBase > 5000000) {
    sbaEligibilityIssues.push('SBA 7(a) max loan is $5M. Consider SBA 504 or conventional financing.');
  }
  
  if (equityInjectionPercent < 10) {
    sbaEligibilityIssues.push('SBA requires minimum 10% equity injection.');
  }
  
  if (dscr < 1.15) {
    sbaEligibilityIssues.push('DSCR below 1.15x - unlikely to qualify for SBA loan.');
  }
  
  // Warnings (not deal-breakers but important)
  if (dscr < 1.25) {
    sbaEligibilityWarnings.push('DSCR below 1.25x - tight debt service coverage. Lenders prefer 1.25x+');
  }
  
  if (equityInjectionPercent < 15 && inputs.purchasePrice > 1000000) {
    sbaEligibilityWarnings.push('For deals >$1M, lenders often prefer 15%+ equity injection.');
  }
  
  if (inputs.sellerNoteStandbyPeriod < 24) {
    sbaEligibilityWarnings.push('SBA typically requires 2-year standby period for seller notes.');
  }
  
  const sbaEligible = sbaEligibilityIssues.length === 0;
  
  return {
    totalProjectCost,
    sbaLoanAmount: totalSBALoan,
    sbaGuaranteeFeeAmount,
    sbaMaxLoanAmount: 5000000,
    equityInjectionRequired,
    equityInjectionPercent,
    sbaMonthlyPayment,
    sellerNoteMonthlyPayment,
    totalMonthlyDebtService,
    annualDebtService,
    dscr,
    cashOnCash,
    yearOneCashFlow,
    paybackPeriodYears,
    sbaEligible,
    sbaEligibilityIssues,
    sbaEligibilityWarnings,
  };
}
