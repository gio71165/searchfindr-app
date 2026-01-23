'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, XCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { Deal } from '@/lib/types/deal';
import type { SBA7aInputs } from '@/lib/types/sba';
import { buildScenarios, type Scenario } from '@/lib/utils/scenario-analysis';
import { calculateSBA7a } from '@/lib/utils/sba-calculator';

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

  // Extract financial data from deal
  const fin = deal?.ai_financials_json || {};
  const finAny = fin as Record<string, unknown>;
  const revenueValue = fin.revenue || finAny.ttm_revenue || finAny.revenue_ttm || finAny.latest_revenue;
  const ebitdaValue = fin.ebitda || finAny.ttm_ebitda || finAny.ebitda_ttm || finAny.latest_ebitda;
  
  const estimatedRevenue = Array.isArray(revenueValue) && revenueValue.length > 0
    ? parseFloat(String(revenueValue[revenueValue.length - 1]?.value || 0).replace(/[^0-9.]/g, ''))
    : typeof revenueValue === 'number' 
      ? revenueValue 
      : typeof revenueValue === 'string'
        ? parseFloat(revenueValue.replace(/[^0-9.]/g, '')) || 0
        : 0;

  const estimatedEBITDA = Array.isArray(ebitdaValue) && ebitdaValue.length > 0
    ? parseFloat(String(ebitdaValue[ebitdaValue.length - 1]?.value || 0).replace(/[^0-9.]/g, ''))
    : typeof ebitdaValue === 'number' 
      ? ebitdaValue 
      : typeof ebitdaValue === 'string'
        ? parseFloat(ebitdaValue.replace(/[^0-9.]/g, '')) || 0
        : 0;

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
      // Build base SBA inputs
      // Estimate purchase price as 3-5x EBITDA (typical for SBA deals)
      const estimatedPurchasePrice = estimatedEBITDA * 4; // 4x EBITDA estimate
      
      const baseInputs: SBA7aInputs = {
        purchasePrice: estimatedPurchasePrice,
        workingCapital: estimatedRevenue * 0.15, // Estimate 15% of revenue
        closingCosts: estimatedPurchasePrice * 0.03, // 3% of purchase
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

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toFixed(0)}`;
  };

  const getDSCRColor = (dscr: number) => {
    if (dscr >= 1.25) return 'text-green-600';
    if (dscr >= 1.15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDSCRIcon = (dscr: number) => {
    if (dscr >= 1.25) return <CheckCircle2 className="h-4 w-4 text-green-600 inline" />;
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
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-slate-600" />
          <h3 className="text-xl font-semibold text-slate-900">
            Scenario Analysis
          </h3>
        </div>
        <p className="text-sm text-slate-600">
          Revenue and EBITDA are required for scenario analysis. Please ensure the deal has financial data.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-slate-600" />
          <h3 className="text-xl font-semibold text-slate-900">
            Scenario Analysis
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600">Top Customer %:</label>
          <input
            type="number"
            value={topCustomerPercent}
            onChange={(e) => setTopCustomerPercent(e.target.value)}
            className="w-20 px-2 py-1 text-sm rounded border border-slate-300 bg-white"
            min="0"
            max="100"
          />
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
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
            <table className="w-full border-collapse bg-white rounded-lg border border-slate-200">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="text-left p-3 text-xs font-semibold text-slate-700">Metric</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-700">Base Case</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-700">Upside</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-700">Downside</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-700">Worst Case</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-sm font-medium text-slate-900">Revenue</td>
                  <td className="p-3 text-sm text-right text-slate-700">{formatCurrency(scenarios.baseCase.adjustedRevenue)}</td>
                  <td className="p-3 text-sm text-right text-green-700">
                    {formatCurrency(scenarios.upside.adjustedRevenue)} 
                    <span className="text-xs ml-1">(+20%)</span>
                  </td>
                  <td className="p-3 text-sm text-right text-yellow-700">
                    {formatCurrency(scenarios.downside.adjustedRevenue)} 
                    <span className="text-xs ml-1">(-20%)</span>
                  </td>
                  <td className="p-3 text-sm text-right text-red-700">
                    {formatCurrency(scenarios.worstCase.adjustedRevenue)} 
                    <span className="text-xs ml-1">(-{topCustomerPercent}%)</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-sm font-medium text-slate-900">EBITDA</td>
                  <td className="p-3 text-sm text-right text-slate-700">{formatCurrency(scenarios.baseCase.adjustedEBITDA)}</td>
                  <td className="p-3 text-sm text-right text-green-700">{formatCurrency(scenarios.upside.adjustedEBITDA)}</td>
                  <td className="p-3 text-sm text-right text-yellow-700">{formatCurrency(scenarios.downside.adjustedEBITDA)}</td>
                  <td className="p-3 text-sm text-right text-red-700">{formatCurrency(scenarios.worstCase.adjustedEBITDA)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-sm font-medium text-slate-900">DSCR</td>
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
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-sm font-medium text-slate-900">Cash-on-Cash</td>
                  <td className="p-3 text-sm text-right text-slate-700">{scenarios.baseCase.outputs.cashOnCash.toFixed(1)}%</td>
                  <td className="p-3 text-sm text-right text-green-700">{scenarios.upside.outputs.cashOnCash.toFixed(1)}%</td>
                  <td className="p-3 text-sm text-right text-yellow-700">{scenarios.downside.outputs.cashOnCash.toFixed(1)}%</td>
                  <td className="p-3 text-sm text-right text-red-700">{scenarios.worstCase.outputs.cashOnCash.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="p-3 text-sm font-medium text-slate-900">Viability</td>
                  <td className="p-3 text-sm text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      scenarios.baseCase.viabilityScore === 'viable' 
                        ? 'bg-green-100 text-green-700'
                        : scenarios.baseCase.viabilityScore === 'marginal'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {scenarios.baseCase.viabilityScore}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-right">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                      {scenarios.upside.viabilityScore}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      scenarios.downside.viabilityScore === 'viable' 
                        ? 'bg-green-100 text-green-700'
                        : scenarios.downside.viabilityScore === 'marginal'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {scenarios.downside.viabilityScore}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      scenarios.worstCase.viabilityScore === 'viable' 
                        ? 'bg-green-100 text-green-700'
                        : scenarios.worstCase.viabilityScore === 'marginal'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
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
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2">Risk Factors</h4>
              <div className="space-y-2">
                {scenarios.downside.riskFactors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-yellow-800 mb-1">Downside Case:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-700">
                      {scenarios.downside.riskFactors.map((factor, idx) => (
                        <li key={idx}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {scenarios.worstCase.riskFactors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-yellow-800 mb-1">Worst Case:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-700">
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
          <div className="p-4 rounded-lg bg-slate-100 border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2">Breakeven Analysis</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">EBITDA Required (DSCR 1.25x)</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatCurrency(scenarios.breakeven.ebitdaRequired)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Margin of Safety</p>
                <p className={`text-lg font-semibold ${
                  scenarios.breakeven.marginOfSafety >= 20 
                    ? 'text-green-600'
                    : scenarios.breakeven.marginOfSafety >= 10
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}>
                  {scenarios.breakeven.marginOfSafety.toFixed(1)}%
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Current EBITDA: {formatCurrency(estimatedEBITDA)} | 
              Required: {formatCurrency(scenarios.breakeven.ebitdaRequired)} | 
              Buffer: {formatCurrency(estimatedEBITDA - scenarios.breakeven.ebitdaRequired)}
            </p>
          </div>
        </div>
      )}

      {!scenarios && !loading && (
        <div className="p-4 rounded-lg bg-slate-100 border border-slate-200">
          <p className="text-sm text-slate-600 mb-2">
            Scenario analysis uses estimated deal structure (4x EBITDA purchase price, 15% WC of revenue).
            For accurate analysis, use the Deal Structure Calculator first to set actual loan terms.
          </p>
          <p className="text-sm text-slate-600">
            Click "Recalculate" to run scenario analysis with current assumptions.
          </p>
        </div>
      )}
    </div>
  );
}
