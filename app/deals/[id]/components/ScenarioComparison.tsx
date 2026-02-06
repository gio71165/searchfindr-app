'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { LoadingDots } from '@/components/ui/LoadingSpinner';
import type { Deal } from '@/lib/types/deal';
import type { SBA7aInputs } from '@/lib/types/sba';
import { buildScenarios, type Scenario } from '@/lib/utils/scenario-analysis';
import { calculateSBA7a } from '@/lib/utils/sba-calculator';
import { parseCurrencyToNumber, formatCurrencyDisplay } from '@/app/deals/[id]/lib/formatters';

export function ScenarioComparison({ deal }: { deal: Deal | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<{
    baseCase: Scenario;
    upside: Scenario;
    downside: Scenario;
    worstCase: Scenario;
    breakeven: { ebitdaRequired: number; marginOfSafety: number };
  } | null>(null);
  const [topCustomerPercent, setTopCustomerPercent] = useState('20');

  // Use CIM/deal-level numbers first so scenario matches Executive Summary & Financial Details
  const fin = deal?.ai_financials_json || {};
  const finAny = fin as Record<string, unknown>;
  const revenueRaw = deal?.revenue_ttm_extracted ?? fin.revenue ?? finAny.revenue_ttm ?? finAny.ttm_revenue ?? finAny.latest_revenue;
  const ebitdaRaw = deal?.ebitda_ttm_extracted ?? fin.ebitda ?? finAny.ttm_ebitda ?? finAny.ebitda_ttm ?? finAny.latest_ebitda;

  const estimatedRevenue = typeof revenueRaw === 'string'
    ? parseCurrencyToNumber(revenueRaw)
    : Array.isArray(revenueRaw) && revenueRaw.length > 0
      ? parseCurrencyToNumber((revenueRaw[revenueRaw.length - 1] as { value?: string | number })?.value)
      : typeof revenueRaw === 'number'
        ? revenueRaw
        : 0;

  const estimatedEBITDA = typeof ebitdaRaw === 'string'
    ? parseCurrencyToNumber(ebitdaRaw)
    : Array.isArray(ebitdaRaw) && ebitdaRaw.length > 0
      ? parseCurrencyToNumber((ebitdaRaw[ebitdaRaw.length - 1] as { value?: string | number })?.value)
      : typeof ebitdaRaw === 'number'
        ? ebitdaRaw
        : 0;

  const dealPurchasePrice = parseCurrencyToNumber(
    deal?.asking_price_extracted ??
    (finAny.estimated_purchase_price as string | number | undefined) ??
    (finAny.purchase_price as string | number | undefined)
  );

  const handleCalculate = async () => {
    if (!estimatedRevenue || estimatedRevenue <= 0) {
      setError('Revenue is required for scenario analysis');
      return;
    }

    if (!estimatedEBITDA || estimatedEBITDA <= 0) {
      setError('EBITDA is required for scenario analysis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const purchasePrice = dealPurchasePrice > 0 ? dealPurchasePrice : estimatedEBITDA * 4;
      const baseInputs: SBA7aInputs = {
        purchasePrice,
        workingCapital: estimatedRevenue * 0.15, // Estimate 15% of revenue
        closingCosts: purchasePrice * 0.03, // 3% of purchase
        sbaGuaranteeFee: 0, // calculated automatically
        packagingFee: 3500,
        interestRate: 10.25,
        loanTermYears: 10,
        sellerNoteAmount: 0,
        sellerNoteRate: 6.0,
        sellerNoteTermYears: 5,
        sellerNoteStandbyPeriod: 24,
        earnoutAmount: 0,
        earnoutTrigger: '',
        ebitda: estimatedEBITDA,
        revenue: estimatedRevenue,
      };

      const topCustomerPct = parseFloat(topCustomerPercent) || 20;
      const results = buildScenarios(baseInputs, estimatedRevenue, topCustomerPct);
      setScenarios(results);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      setError(error.message || 'Failed to calculate scenarios');
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate if we have the data
  useEffect(() => {
    if (estimatedRevenue > 0 && estimatedEBITDA > 0 && !scenarios && !loading) {
      handleCalculate();
    }
  }, [estimatedRevenue, estimatedEBITDA]);

  const formatCurrency = formatCurrencyDisplay;

  const getDSCRColor = (dscr: number) => {
    if (dscr >= 1.25) return 'text-emerald-600';
    if (dscr >= 1.15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDSCRIcon = (dscr: number) => {
    if (dscr >= 1.25) return <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" />;
    if (dscr >= 1.15) return <AlertTriangle className="h-4 w-4 text-yellow-600 inline" />;
    return <XCircle className="h-4 w-4 text-red-600 inline" />;
  };

  const getDSCRSymbol = (dscr: number) => {
    if (dscr >= 1.25) return '✅';
    if (dscr >= 1.15) return '⚠️';
    return '❌';
  };

  if (!estimatedRevenue || !estimatedEBITDA) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-slate-400" />
          <h3 className="text-xl font-semibold text-slate-50">
            Scenario Analysis
          </h3>
        </div>
        <p className="text-sm text-slate-400">
          Revenue and EBITDA are required for scenario analysis. Please ensure the deal has financial data.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-slate-400" />
          <h3 className="text-xl font-semibold text-slate-50">
            Scenario Analysis
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Top Customer %:</label>
          <input
            type="number"
            value={topCustomerPercent}
            onChange={(e) => setTopCustomerPercent(e.target.value)}
            className="w-20 px-2 py-1 text-sm rounded border border-slate-700 bg-slate-900 text-slate-50"
            min="0"
            max="100"
          />
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="btn-secondary btn-sm flex items-center gap-1 disabled:opacity-50"
          >
            {loading ? (
              <>
                <LoadingDots />
                <span>Calculating...</span>
              </>
            ) : (
              <span>Recalculate</span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {scenarios && (
        <div className="space-y-4">
          {/* Scenario Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-slate-800/50 rounded-lg border border-slate-700">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700">
                  <th className="text-left p-3 text-xs font-semibold text-slate-300">Metric</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-300">Base Case</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-300">Upside</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-300">Downside</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-300">Worst Case</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700">
                  <td className="p-3 text-sm font-medium text-slate-50">Revenue</td>
                  <td className="p-3 text-sm text-right text-slate-300">{formatCurrency(scenarios.baseCase.adjustedRevenue)}</td>
                  <td className="p-3 text-sm text-right text-emerald-400">
                    {formatCurrency(scenarios.upside.adjustedRevenue)} 
                    <span className="text-xs ml-1">(+20%)</span>
                  </td>
                  <td className="p-3 text-sm text-right text-amber-400">
                    {formatCurrency(scenarios.downside.adjustedRevenue)} 
                    <span className="text-xs ml-1">(-20%)</span>
                  </td>
                  <td className="p-3 text-sm text-right text-red-400">
                    {formatCurrency(scenarios.worstCase.adjustedRevenue)} 
                    <span className="text-xs ml-1">(-{topCustomerPercent}%)</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td className="p-3 text-sm font-medium text-slate-50">EBITDA</td>
                  <td className="p-3 text-sm text-right text-slate-300">{formatCurrency(scenarios.baseCase.adjustedEBITDA)}</td>
                  <td className="p-3 text-sm text-right text-emerald-400">{formatCurrency(scenarios.upside.adjustedEBITDA)}</td>
                  <td className="p-3 text-sm text-right text-amber-400">{formatCurrency(scenarios.downside.adjustedEBITDA)}</td>
                  <td className="p-3 text-sm text-right text-red-400">{formatCurrency(scenarios.worstCase.adjustedEBITDA)}</td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td className="p-3 text-sm font-medium text-slate-50">DSCR</td>
                  <td className={`p-3 text-sm text-right font-semibold ${getDSCRColor(scenarios.baseCase.outputs.dscr)}`}>
                    {scenarios.baseCase.outputs.dscr.toFixed(2)}x {getDSCRSymbol(scenarios.baseCase.outputs.dscr)}
                  </td>
                  <td className={`p-3 text-sm text-right font-semibold ${getDSCRColor(scenarios.upside.outputs.dscr)}`}>
                    {scenarios.upside.outputs.dscr.toFixed(2)}x {getDSCRSymbol(scenarios.upside.outputs.dscr)}
                  </td>
                  <td className={`p-3 text-sm text-right font-semibold ${getDSCRColor(scenarios.downside.outputs.dscr)}`}>
                    {scenarios.downside.outputs.dscr.toFixed(2)}x {getDSCRSymbol(scenarios.downside.outputs.dscr)}
                  </td>
                  <td className={`p-3 text-sm text-right font-semibold ${getDSCRColor(scenarios.worstCase.outputs.dscr)}`}>
                    {scenarios.worstCase.outputs.dscr.toFixed(2)}x {getDSCRSymbol(scenarios.worstCase.outputs.dscr)}
                  </td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td className="p-3 text-sm font-medium text-slate-50">Cash-on-Cash</td>
                  <td className="p-3 text-sm text-right text-slate-300">{scenarios.baseCase.outputs.cashOnCash.toFixed(1)}%</td>
                  <td className="p-3 text-sm text-right text-emerald-400">{scenarios.upside.outputs.cashOnCash.toFixed(1)}%</td>
                  <td className="p-3 text-sm text-right text-amber-400">{scenarios.downside.outputs.cashOnCash.toFixed(1)}%</td>
                  <td className="p-3 text-sm text-right text-red-400">{scenarios.worstCase.outputs.cashOnCash.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="p-3 text-sm font-medium text-slate-50">Viability</td>
                  <td className="p-3 text-sm text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      scenarios.baseCase.viabilityScore === 'viable' 
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : scenarios.baseCase.viabilityScore === 'marginal'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                    }`}>
                      {scenarios.baseCase.viabilityScore}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-right">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300">
                      {scenarios.upside.viabilityScore}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      scenarios.downside.viabilityScore === 'viable' 
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : scenarios.downside.viabilityScore === 'marginal'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                    }`}>
                      {scenarios.downside.viabilityScore}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      scenarios.worstCase.viabilityScore === 'viable' 
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : scenarios.worstCase.viabilityScore === 'marginal'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                    }`}>
                      {scenarios.worstCase.viabilityScore}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Risk Factors */}
          {(scenarios.downside.riskFactors.length > 0 || scenarios.worstCase.riskFactors.length > 0) && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <h4 className="font-semibold text-amber-200 mb-2">Risk Factors</h4>
              <div className="space-y-2">
                {scenarios.downside.riskFactors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-amber-200 mb-1">Downside Case:</p>
                    <ul className="list-disc list-inside text-sm text-slate-300">
                      {scenarios.downside.riskFactors.map((factor, idx) => (
                        <li key={idx}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {scenarios.worstCase.riskFactors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-amber-200 mb-1">Worst Case:</p>
                    <ul className="list-disc list-inside text-sm text-slate-300">
                      {scenarios.worstCase.riskFactors.map((factor, idx) => (
                        <li key={idx}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Breakeven Analysis */}
          <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-700">
            <h4 className="font-semibold text-slate-50 mb-2">Breakeven Analysis</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">EBITDA Required (DSCR 1.25x)</p>
                <p className="text-lg font-semibold text-slate-50">
                  {formatCurrency(scenarios.breakeven.ebitdaRequired)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Margin of Safety</p>
                <p className={`text-lg font-semibold ${
                  scenarios.breakeven.marginOfSafety >= 20 
                    ? 'text-emerald-600'
                    : scenarios.breakeven.marginOfSafety >= 10
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}>
                  {scenarios.breakeven.marginOfSafety.toFixed(1)}%
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Current EBITDA: {formatCurrency(estimatedEBITDA)} | 
              Required: {formatCurrency(scenarios.breakeven.ebitdaRequired)} | 
              Buffer: {formatCurrency(estimatedEBITDA - scenarios.breakeven.ebitdaRequired)}
            </p>
          </div>
        </div>
      )}

      {!scenarios && !loading && (
        <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-700">
          <p className="text-sm text-slate-400 mb-2">
            Scenario analysis uses estimated deal structure (4x EBITDA purchase price, 15% WC of revenue).
            For accurate analysis, use the Deal Structure Calculator first to set actual loan terms.
          </p>
          <p className="text-sm text-slate-400">
            Click "Recalculate" to run scenario analysis with current assumptions.
          </p>
        </div>
      )}
    </div>
  );
}
