export interface SBA7aInputs {
  // Purchase details
  purchasePrice: number;
  workingCapital: number;
  closingCosts: number; // typically 3-5% of purchase price
  
  // SBA loan specifics
  sbaGuaranteeFee: number; // auto-calculated based on loan amount
  packagingFee: number; // typically $2,500-$5,000
  
  // Loan terms
  interestRate: number; // Prime + 2.75% typical for SBA 7(a)
  loanTermYears: number; // 10 years standard
  
  // Seller financing (optional)
  sellerNoteAmount: number;
  sellerNoteRate: number;
  sellerNoteTermYears: number;
  sellerNoteStandbyPeriod: number; // SBA requires 2 years typically
  
  // Earnout (optional)
  earnoutAmount: number;
  earnoutTrigger: string; // description
  
  // Business financials
  ebitda: number;
  revenue: number;
  
  // Industry classification (for fee waiver detection)
  naicsCode?: string | null;
}

export interface SBA7aOutputs {
  // Project costs
  totalProjectCost: number;
  
  // SBA loan details
  sbaLoanAmount: number;
  sbaGuaranteeFeeAmount: number;
  sbaMaxLoanAmount: number; // $5M for 7(a)
  
  // Equity
  equityInjectionRequired: number;
  equityInjectionPercent: number;
  
  // Debt service
  sbaMonthlyPayment: number;
  sellerNoteMonthlyPayment: number;
  totalMonthlyDebtService: number;
  annualDebtService: number;
  
  // Key metrics
  dscr: number; // Debt Service Coverage Ratio
  cashOnCash: number;
  yearOneCashFlow: number;
  paybackPeriodYears: number;
  
  // SBA eligibility
  sbaEligible: boolean;
  sbaEligibilityIssues: string[];
  sbaEligibilityWarnings: string[];
  
  // Fee waiver (manufacturing)
  feeWaiverSavings?: number;
  warnings?: Array<{
    type: 'bonus' | 'warning' | 'error';
    severity: 'success' | 'info' | 'warning' | 'error';
    message: string;
  }>;
  
  // Scenario comparison
  irr5Year?: number; // optional advanced metric
}

export interface SBAScenario {
  name: string;
  description: string;
  inputs: SBA7aInputs;
  outputs: SBA7aOutputs;
}
