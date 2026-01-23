'use client';

import { useState } from 'react';
import { Calculator, Loader2, AlertTriangle, CheckCircle2, TrendingUp, Info, Sparkles } from 'lucide-react';
import type { Deal } from '@/lib/types/deal';
import type { SBA7aInputs, SBA7aOutputs, SBAScenario } from '@/lib/types/sba';
import { JargonTooltip } from '@/components/ui/JargonTooltip';

type CalculatorMode = 'simple' | 'sba';

type SimpleCalculatorResult = {
  loanAmount: number;
  monthlyPayment: number;
  debtServiceCoverage: number;
  cashOnCashReturn: number;
  paybackPeriod: number;
};

export function DealStructureCalculator({ deal }: { deal: Deal | null }) {
  const [mode, setMode] = useState<CalculatorMode>('sba');
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Simple mode state
  const [purchasePrice, setPurchasePrice] = useState('');
  const [downPaymentPct, setDownPaymentPct] = useState('10');
  const [interestRate, setInterestRate] = useState('7.5');
  const [loanTerm, setLoanTerm] = useState('10');
  const [simpleResult, setSimpleResult] = useState<SimpleCalculatorResult | null>(null);
  
  // SBA mode state
  const [sbaInputs, setSbaInputs] = useState<Partial<SBA7aInputs>>({
    workingCapital: 0,
    closingCosts: 0,
    packagingFee: 3500,
    interestRate: 10.25,
    loanTermYears: 10,
    sellerNoteAmount: 0,
    sellerNoteRate: 6.0,
    sellerNoteTermYears: 5,
    sellerNoteStandbyPeriod: 24,
    earnoutAmount: 0,
    earnoutTrigger: '',
  });
  const [sbaResult, setSbaResult] = useState<SBA7aOutputs | null>(null);
  const [showScenarios, setShowScenarios] = useState(false);
  const [scenarios, setScenarios] = useState<SBAScenario[]>([]);

  // Try to extract purchase price and EBITDA from deal data
  const fin = deal?.ai_financials_json || {};
  const finAny = fin as Record<string, unknown>;
  const estimatedPrice = (finAny.estimated_purchase_price as string | undefined) || 
    (finAny.purchase_price as string | undefined) || 
    deal?.asking_price_extracted || '';
  
  const ebitdaValue = fin.ebitda 
    ? parseFloat(String(fin.ebitda).replace(/[^0-9.]/g, '')) 
    : deal?.ebitda_ttm_extracted 
      ? parseFloat(String(deal.ebitda_ttm_extracted).replace(/[^0-9.]/g, ''))
      : null;

  const handleSimpleCalculate = async () => {
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
      setSimpleResult({
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

  const handleSBACalculate = async () => {
    const price = parseFloat(purchasePrice);
    if (!price || price <= 0) {
      setError('Please enter a valid purchase price');
      return;
    }

    if (!ebitdaValue || ebitdaValue <= 0) {
      setError('EBITDA is required for calculation');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const inputs: SBA7aInputs = {
        purchasePrice: price,
        workingCapital: sbaInputs.workingCapital ?? 0,
        closingCosts: sbaInputs.closingCosts ?? (price * 0.03),
        sbaGuaranteeFee: 0,
        packagingFee: sbaInputs.packagingFee ?? 3500,
        interestRate: sbaInputs.interestRate ?? 10.25,
        loanTermYears: sbaInputs.loanTermYears ?? 10,
        sellerNoteAmount: sbaInputs.sellerNoteAmount ?? 0,
        sellerNoteRate: sbaInputs.sellerNoteRate ?? 6.0,
        sellerNoteTermYears: sbaInputs.sellerNoteTermYears ?? 5,
        sellerNoteStandbyPeriod: sbaInputs.sellerNoteStandbyPeriod ?? 24,
        earnoutAmount: sbaInputs.earnoutAmount ?? 0,
        earnoutTrigger: sbaInputs.earnoutTrigger ?? '',
        ebitda: ebitdaValue,
        revenue: sbaInputs.revenue ?? 0,
        naicsCode: sbaInputs.naicsCode,
      };

      const res = await fetch('/api/calculate-sba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Calculation failed' }));
        throw new Error(errorData.error || 'Calculation failed');
      }

      const data = await res.json();
      setSbaResult(data.outputs);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      setError(error.message || 'Failed to calculate');
    } finally {
      setCalculating(false);
    }
  };

  const handleCompareScenarios = async () => {
    const price = parseFloat(purchasePrice);
    if (!price || price <= 0 || !ebitdaValue || ebitdaValue <= 0) {
        setError('Purchase price and EBITDA are required');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const baseInputs: Partial<SBA7aInputs> = {
        purchasePrice: price,
        workingCapital: sbaInputs.workingCapital ?? 0,
        closingCosts: sbaInputs.closingCosts ?? (price * 0.03),
        packagingFee: sbaInputs.packagingFee ?? 3500,
        interestRate: sbaInputs.interestRate ?? 10.25,
        loanTermYears: sbaInputs.loanTermYears ?? 10,
        sellerNoteRate: sbaInputs.sellerNoteRate ?? 6.0,
        sellerNoteTermYears: sbaInputs.sellerNoteTermYears ?? 5,
        sellerNoteStandbyPeriod: 24,
        earnoutAmount: 0,
        earnoutTrigger: '',
        ebitda: ebitdaValue,
        revenue: sbaInputs.revenue ?? 0,
      };

      const scenarioInputs = [
        { name: 'SBA Only', description: 'No seller financing', sellerNoteAmount: 0 },
        { name: 'SBA + 20% Seller Note', description: '20% seller note at 6%', sellerNoteAmount: price * 0.2 },
        { name: 'SBA + 30% Seller Note', description: '30% seller note at 6%', sellerNoteAmount: price * 0.3 },
      ];

      const scenarioPromises = scenarioInputs.map(async (scenario) => {
        const inputs: SBA7aInputs = {
          ...baseInputs,
          sellerNoteAmount: scenario.sellerNoteAmount,
        } as SBA7aInputs;

        const res = await fetch('/api/calculate-sba', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputs),
        });

        if (!res.ok) throw new Error('Scenario calculation failed');
        const data = await res.json();

        return {
          name: scenario.name,
          description: scenario.description,
          inputs,
          outputs: data.outputs,
        } as SBAScenario;
      });

      const results = await Promise.all(scenarioPromises);
      setScenarios(results);
      setShowScenarios(true);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      setError(error.message || 'Failed to compare scenarios');
    } finally {
      setCalculating(false);
    }
  };

  const getMetricColor = (value: number, metric: string) => {
    if (metric === 'dsc') {
      if (value >= 1.5) return 'text-green-600';
      if (value >= 1.25) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (metric === 'coc') {
      if (value >= 20) return 'text-green-600';
      if (value >= 10) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-slate-700';
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-slate-600" />
          <h3 className="text-xl font-semibold text-slate-900">
            Deal Structure Calculator
          </h3>
        </div>
        <div className="flex gap-2 bg-slate-200 rounded-lg p-1">
          <button
            onClick={() => setMode('simple')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              mode === 'simple'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => setMode('sba')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              mode === 'sba'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SBA 7(a)
          </button>
        </div>
      </div>

      {/* Common fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Purchase Price ($)
          </label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder={estimatedPrice || 'Enter purchase price'}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {mode === 'simple' ? (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Down Payment (%)
              </label>
              <input
                type="number"
                value={downPaymentPct}
                onChange={(e) => setDownPaymentPct(e.target.value)}
                step="0.1"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Interest Rate (%)
              </label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                step="0.1"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Loan Term (years)
              </label>
              <input
                type="number"
                value={loanTerm}
                onChange={(e) => setLoanTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Working Capital ($)
              </label>
              <input
                type="number"
                value={sbaInputs.workingCapital ?? 0}
                onChange={(e) => setSbaInputs({ ...sbaInputs, workingCapital: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Closing Costs ($)
                <span className="text-slate-500 ml-1">(default: 3% of purchase)</span>
              </label>
              <input
                type="number"
                value={sbaInputs.closingCosts ?? 0}
                onChange={(e) => setSbaInputs({ ...sbaInputs, closingCosts: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Packaging Fee ($)
              </label>
              <input
                type="number"
                value={sbaInputs.packagingFee ?? 3500}
                onChange={(e) => setSbaInputs({ ...sbaInputs, packagingFee: parseFloat(e.target.value) || 3500 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Interest Rate (%)
                <span className="text-slate-500 ml-1">(Prime + 2.75%)</span>
              </label>
              <input
                type="number"
                value={sbaInputs.interestRate ?? 10.25}
                onChange={(e) => setSbaInputs({ ...sbaInputs, interestRate: parseFloat(e.target.value) || 10.25 })}
                step="0.1"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Loan Term (years)
              </label>
              <input
                type="number"
                value={sbaInputs.loanTermYears ?? 10}
                onChange={(e) => setSbaInputs({ ...sbaInputs, loanTermYears: parseFloat(e.target.value) || 10 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Seller Note Amount ($)
              </label>
              <input
                type="number"
                value={sbaInputs.sellerNoteAmount ?? 0}
                onChange={(e) => setSbaInputs({ ...sbaInputs, sellerNoteAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Seller Note Rate (%)
              </label>
              <input
                type="number"
                value={sbaInputs.sellerNoteRate ?? 6.0}
                onChange={(e) => setSbaInputs({ ...sbaInputs, sellerNoteRate: parseFloat(e.target.value) || 6.0 })}
                step="0.1"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Seller Note Term (years)
              </label>
              <input
                type="number"
                value={sbaInputs.sellerNoteTermYears ?? 5}
                onChange={(e) => setSbaInputs({ ...sbaInputs, sellerNoteTermYears: parseFloat(e.target.value) || 5 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                <JargonTooltip term="NAICS">NAICS</JargonTooltip> Code
                <span className="text-slate-500 ml-1">(for fee waiver detection)</span>
              </label>
              <input
                type="text"
                value={sbaInputs.naicsCode ?? ''}
                onChange={(e) => setSbaInputs({ ...sbaInputs, naicsCode: e.target.value || undefined })}
                placeholder="e.g., 311, 321, 331"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={mode === 'simple' ? handleSimpleCalculate : handleSBACalculate}
          disabled={calculating || !purchasePrice}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        {mode === 'sba' && (
          <button
            onClick={handleCompareScenarios}
            disabled={calculating || !purchasePrice}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Compare Scenarios</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* SBA Eligibility Warnings */}
      {mode === 'sba' && sbaResult && (
        <div className="mt-4 space-y-2">
          {sbaResult.sbaEligibilityIssues.length > 0 && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-1">SBA Eligibility Issues</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {sbaResult.sbaEligibilityIssues.map((issue, idx) => (
                      <li key={idx} className="text-sm text-red-700">{issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {sbaResult.sbaEligibilityWarnings.length > 0 && (
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-1">SBA Eligibility Warnings</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {sbaResult.sbaEligibilityWarnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-yellow-700">{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {sbaResult.sbaEligible && sbaResult.sbaEligibilityWarnings.length === 0 && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">SBA eligible - meets all requirements</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simple Results */}
      {mode === 'simple' && simpleResult && (
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Loan Amount</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(simpleResult.loanAmount)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Monthly Payment</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(simpleResult.monthlyPayment)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Debt Service Coverage</p>
              <p className={`text-lg font-semibold ${getMetricColor(simpleResult.debtServiceCoverage, 'dsc')}`}>
                {simpleResult.debtServiceCoverage.toFixed(2)}x
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Cash-on-Cash Return</p>
              <p className={`text-lg font-semibold ${getMetricColor(simpleResult.cashOnCashReturn, 'coc')}`}>
                {simpleResult.cashOnCashReturn.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Payback Period</p>
            <p className="text-lg font-semibold text-slate-900">
              {simpleResult.paybackPeriod.toFixed(1)} years
            </p>
          </div>
        </div>
      )}

      {/* SBA Results */}
      {mode === 'sba' && sbaResult && !showScenarios && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Total Project Cost</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(sbaResult.totalProjectCost)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">SBA Loan Amount</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(sbaResult.sbaLoanAmount)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Equity Required</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(sbaResult.equityInjectionRequired)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ({sbaResult.equityInjectionPercent.toFixed(1)}%)
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">SBA Monthly Payment</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(sbaResult.sbaMonthlyPayment)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Total Monthly Debt</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(sbaResult.totalMonthlyDebtService)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">DSCR</p>
              <p className={`text-lg font-semibold ${getMetricColor(sbaResult.dscr, 'dsc')}`}>
                {sbaResult.dscr.toFixed(2)}x
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Cash-on-Cash Return</p>
              <p className={`text-lg font-semibold ${getMetricColor(sbaResult.cashOnCash, 'coc')}`}>
                {sbaResult.cashOnCash.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Year 1 Cash Flow</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(sbaResult.yearOneCashFlow)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Payback Period</p>
              <p className="text-lg font-semibold text-slate-900">
                {sbaResult.paybackPeriodYears.toFixed(1)} years
              </p>
            </div>
          </div>
          {/* Fee Waiver Savings - Display prominently */}
          {sbaResult.feeWaiverSavings && sbaResult.feeWaiverSavings > 0 && (
            <div className="p-4 rounded-lg bg-green-50 border-2 border-green-400 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1">Manufacturing Fee Waiver Savings</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${sbaResult.feeWaiverSavings.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    $0 SBA guarantee fee applied (waiver expires Sept 30, 2026)
                  </p>
                </div>
                <Sparkles className="h-8 w-8 text-green-600" />
              </div>
            </div>
          )}
          {sbaResult.sbaGuaranteeFeeAmount > 0 && (
            <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">SBA Guarantee Fee</p>
              <p className="text-sm font-medium text-slate-900">
                {formatCurrency(sbaResult.sbaGuaranteeFeeAmount)} (included in loan amount)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scenario Comparison */}
      {mode === 'sba' && showScenarios && scenarios.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-slate-900">Scenario Comparison</h4>
            <button
              onClick={() => setShowScenarios(false)}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map((scenario, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-white border border-slate-200">
                <h5 className="font-semibold text-slate-900 mb-1">{scenario.name}</h5>
                <p className="text-xs text-slate-600 mb-3">{scenario.description}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-600">Equity Required</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(scenario.outputs.equityInjectionRequired)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Monthly Payment</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(scenario.outputs.totalMonthlyDebtService)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">
                      <JargonTooltip term="DSCR">DSCR</JargonTooltip>
                    </p>
                    <p className={`text-sm font-semibold ${getMetricColor(scenario.outputs.dscr, 'dsc')}`}>
                      {scenario.outputs.dscr.toFixed(2)}x
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Cash-on-Cash</p>
                    <p className={`text-sm font-semibold ${getMetricColor(scenario.outputs.cashOnCash, 'coc')}`}>
                      {scenario.outputs.cashOnCash.toFixed(1)}%
                    </p>
                  </div>
                  {scenario.outputs.sbaEligibilityIssues.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs text-red-600 font-medium">Not SBA Eligible</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
