// app/api/calculate-deal-structure/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/api/auth";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

type DealStructureInput = {
  purchase_price: number;
  down_payment_pct?: number; // default 10
  interest_rate?: number; // default 7.5 for SBA
  loan_term_years?: number; // default 10
  ebitda: number;
};

type DealStructureOutput = {
  purchase_price: number;
  down_payment_pct: number;
  interest_rate: number;
  loan_term_years: number;
  ebitda: number;
  loan_amount: number;
  equity_required: number;
  monthly_payment: number;
  annual_debt_service: number;
  debt_service_coverage_ratio: number;
  cash_on_cash_return: number;
  payback_period_years: number;
};

/**
 * Calculate monthly loan payment using standard amortization formula
 * P = L * [r(1+r)^n] / [(1+r)^n - 1]
 * where P = monthly payment, L = loan amount, r = monthly interest rate, n = number of payments
 */
function calculateMonthlyPayment(loanAmount: number, annualRate: number, years: number): number {
  if (loanAmount <= 0 || years <= 0) return 0;
  
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  
  if (monthlyRate === 0) {
    // Interest-free loan
    return loanAmount / numPayments;
  }
  
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, numPayments);
  const denominator = Math.pow(1 + monthlyRate, numPayments) - 1;
  
  return loanAmount * (numerator / denominator);
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate request
    await authenticateRequest(req);

    const body = (await req.json()) as DealStructureInput;

    const purchasePrice = Number(body.purchase_price);
    const downPaymentPct = Number(body.down_payment_pct ?? 10);
    const interestRate = Number(body.interest_rate ?? 7.5);
    const loanTermYears = Number(body.loan_term_years ?? 10);
    const ebitda = Number(body.ebitda);

    // Validation
    if (!purchasePrice || purchasePrice <= 0) {
      return NextResponse.json(
        { error: "purchase_price must be a positive number" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (downPaymentPct < 0 || downPaymentPct >= 100) {
      return NextResponse.json(
        { error: "down_payment_pct must be between 0 and 100" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (interestRate < 0 || interestRate > 50) {
      return NextResponse.json(
        { error: "interest_rate must be between 0 and 50" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (loanTermYears <= 0 || loanTermYears > 30) {
      return NextResponse.json(
        { error: "loan_term_years must be between 1 and 30" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!ebitda || ebitda <= 0) {
      return NextResponse.json(
        { error: "ebitda must be a positive number" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Calculations
    const equityRequired = (purchasePrice * downPaymentPct) / 100;
    const loanAmount = purchasePrice - equityRequired;
    const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, loanTermYears);
    const annualDebtService = monthlyPayment * 12;
    const debtServiceCoverageRatio = annualDebtService > 0 ? ebitda / annualDebtService : 0;
    
    // Cash on cash return = (EBITDA - Annual Debt Service) / Equity Required
    const cashFlow = ebitda - annualDebtService;
    const cashOnCashReturn = equityRequired > 0 ? (cashFlow / equityRequired) * 100 : 0;
    
    // Payback period = Equity Required / Annual Cash Flow (simplified)
    const paybackPeriodYears = cashFlow > 0 ? equityRequired / cashFlow : Infinity;

    const output: DealStructureOutput = {
      purchase_price: purchasePrice,
      down_payment_pct: downPaymentPct,
      interest_rate: interestRate,
      loan_term_years: loanTermYears,
      ebitda: ebitda,
      loan_amount: Math.round(loanAmount * 100) / 100,
      equity_required: Math.round(equityRequired * 100) / 100,
      monthly_payment: Math.round(monthlyPayment * 100) / 100,
      annual_debt_service: Math.round(annualDebtService * 100) / 100,
      debt_service_coverage_ratio: Math.round(debtServiceCoverageRatio * 100) / 100,
      cash_on_cash_return: Math.round(cashOnCashReturn * 100) / 100,
      payback_period_years: Math.round(paybackPeriodYears * 100) / 100,
    };

    return NextResponse.json(output, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode, headers: corsHeaders });
    }
    console.error("calculate-deal-structure error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
