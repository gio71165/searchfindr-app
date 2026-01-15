'use client';

import { useState } from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import type { Deal } from '@/lib/types/deal';

type CalculatorResult = {
  loanAmount: number;
  monthlyPayment: number;
  debtServiceCoverage: number;
  cashOnCashReturn: number;
  paybackPeriod: number;
};

export function DealStructureCalculator({ deal }: { deal: Deal | null }) {
  const [purchasePrice, setPurchasePrice] = useState('');
  const [downPaymentPct, setDownPaymentPct] = useState('10');
  const [interestRate, setInterestRate] = useState('7.5');
  const [loanTerm, setLoanTerm] = useState('10');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Try to extract purchase price from deal data
  const fin = deal?.ai_financials_json || {};
  const estimatedPrice = fin.estimated_purchase_price || fin.purchase_price || '';

  const handleCalculate = async () => {
    const price = parseFloat(purchasePrice);
    const downPct = parseFloat(downPaymentPct);
    const rate = parseFloat(interestRate);
    const term = parseFloat(loanTerm);

    if (!price || price <= 0) {
      setError('Please enter a valid purchase price');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const ebitdaValue = fin.ebitda ? parseFloat(String(fin.ebitda).replace(/[^0-9.]/g, '')) : null;
      if (!ebitdaValue || ebitdaValue <= 0) {
        setError('EBITDA is required for calculation');
        return;
      }

      const res = await fetch('/api/calculate-deal-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_price: price,
          down_payment_pct: downPct,
          interest_rate: rate,
          loan_term_years: term,
          ebitda: ebitdaValue,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Calculation failed' }));
        throw new Error(errorData.error || 'Calculation failed');
      }

      const data = await res.json();
      setResult({
        loanAmount: data.loan_amount,
        monthlyPayment: data.monthly_payment,
        debtServiceCoverage: data.debt_service_coverage_ratio,
        cashOnCashReturn: data.cash_on_cash_return,
        paybackPeriod: data.payback_period_years,
      });
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      setError(error.message || 'Failed to calculate');
    } finally {
      setCalculating(false);
    }
  };

  const getMetricColor = (value: number, metric: string) => {
    if (metric === 'dsc') {
      if (value >= 1.5) return 'text-green-600 dark:text-green-400';
      if (value >= 1.2) return 'text-yellow-600 dark:text-yellow-400';
      return 'text-red-600 dark:text-red-400';
    }
    if (metric === 'coc') {
      if (value >= 20) return 'text-green-600 dark:text-green-400';
      if (value >= 10) return 'text-yellow-600 dark:text-yellow-400';
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-slate-700 dark:text-slate-300';
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Deal Structure Calculator
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Purchase Price ($)
          </label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder={estimatedPrice || 'Enter purchase price'}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Down Payment (%)
          </label>
          <input
            type="number"
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(e.target.value)}
            step="0.1"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Interest Rate (%)
          </label>
          <input
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            step="0.1"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Loan Term (years)
          </label>
          <input
            type="number"
            value={loanTerm}
            onChange={(e) => setLoanTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={calculating || !purchasePrice}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {calculating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Calculating...</span>
          </>
        ) : (
          <>
            <Calculator className="h-4 w-4" />
            <span>Calculate</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Loan Amount</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                ${(result.loanAmount / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Monthly Payment</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                ${(result.monthlyPayment / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Debt Service Coverage</p>
              <p className={`text-lg font-semibold ${getMetricColor(result.debtServiceCoverage, 'dsc')}`}>
                {result.debtServiceCoverage.toFixed(2)}x
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Cash-on-Cash Return</p>
              <p className={`text-lg font-semibold ${getMetricColor(result.cashOnCashReturn, 'coc')}`}>
                {result.cashOnCashReturn.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Payback Period</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {result.paybackPeriod.toFixed(1)} years
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
