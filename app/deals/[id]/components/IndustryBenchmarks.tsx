'use client';

import { useEffect, useState } from 'react';
import { getBenchmarkForDeal, type IndustryBenchmark } from '@/lib/data/industry-benchmarks';
import type { Deal } from '@/lib/types/deal';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface IndustryBenchmarksProps {
  deal: Deal;
}

interface ComparisonMetric {
  label: string;
  dealValue: string;
  benchmarkValue: string;
  percentile: string;
  status: 'good' | 'warning' | 'poor' | 'unknown';
}

export function IndustryBenchmarks({ deal }: IndustryBenchmarksProps) {
  const [benchmark, setBenchmark] = useState<IndustryBenchmark | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyRisks, setKeyRisks] = useState<string[]>([]);
  const [keyValueDrivers, setKeyValueDrivers] = useState<string[]>([]);

  useEffect(() => {
    async function loadBenchmark() {
      if (!deal.industry) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Extract revenue and EBITDA
        const revenue = deal.ai_financials_json?.revenue?.[0]?.value;
        const ebitda = deal.ai_financials_json?.ebitda?.[0]?.value;
        
        let revenueNum: number | null = null;
        let ebitdaNum: number | null = null;
        
        if (revenue) {
          revenueNum = parseFloat(revenue.toString().replace(/[^0-9.]/g, ''));
        }
        if (ebitda) {
          ebitdaNum = parseFloat(ebitda.toString().replace(/[^0-9.]/g, ''));
        }

        const comparison = await getBenchmarkForDeal(deal.industry, revenueNum, ebitdaNum);
        
        if (comparison.benchmark) {
          setBenchmark(comparison.benchmark);
          setKeyRisks(comparison.benchmark.key_risks || []);
          setKeyValueDrivers(comparison.benchmark.key_value_drivers || []);
          
          // Build comparison metrics
          const metrics: ComparisonMetric[] = [];
          
          // EBITDA Margin comparison
          if (revenueNum && ebitdaNum && revenueNum > 0 && comparison.benchmark.ebitda_margin_median) {
            const margin = (ebitdaNum / revenueNum) * 100;
            let percentile = 'Unknown';
            let status: 'good' | 'warning' | 'poor' | 'unknown' = 'unknown';
            
            if (comparison.benchmark.ebitda_margin_p75 && margin > comparison.benchmark.ebitda_margin_p75) {
              percentile = '75th+';
              status = 'good';
            } else if (comparison.benchmark.ebitda_margin_p25 && margin < comparison.benchmark.ebitda_margin_p25) {
              percentile = '<25th';
              status = 'poor';
            } else {
              percentile = '25th-75th';
              status = 'warning';
            }
            
            metrics.push({
              label: 'EBITDA Margin',
              dealValue: `${margin.toFixed(1)}%`,
              benchmarkValue: `${comparison.benchmark.ebitda_margin_median}%`,
              percentile,
              status,
            });
          }
          
          // Valuation Multiple comparison
          if (deal.asking_price_extracted && ebitdaNum && ebitdaNum > 0 && comparison.benchmark.valuation_multiple_median) {
            const askingPriceStr = deal.asking_price_extracted.toString().replace(/[^0-9.]/g, '');
            const askingPrice = parseFloat(askingPriceStr);
            
            if (askingPrice > 0) {
              const multiple = askingPrice / ebitdaNum;
              let percentile = 'Unknown';
              let status: 'good' | 'warning' | 'poor' | 'unknown' = 'unknown';
              
              if (comparison.benchmark.valuation_multiple_p75 && multiple > comparison.benchmark.valuation_multiple_p75) {
                percentile = '75th+';
                status = 'poor'; // High multiple is bad for buyer
              } else if (comparison.benchmark.valuation_multiple_p25 && multiple < comparison.benchmark.valuation_multiple_p25) {
                percentile = '<25th';
                status = 'good'; // Low multiple is good for buyer
              } else {
                percentile = '25th-75th';
                status = 'warning';
              }
              
              metrics.push({
                label: 'Valuation Multiple',
                dealValue: `${multiple.toFixed(1)}x`,
                benchmarkValue: `${comparison.benchmark.valuation_multiple_median}x`,
                percentile,
                status,
              });
            }
          }
          
          // Revenue comparison
          if (revenueNum && comparison.benchmark.revenue_median) {
            let percentile = 'Unknown';
            let status: 'good' | 'warning' | 'poor' | 'unknown' = 'unknown';
            
            if (comparison.benchmark.revenue_p75 && revenueNum > comparison.benchmark.revenue_p75) {
              percentile = '75th+';
              status = 'good';
            } else if (comparison.benchmark.revenue_p25 && revenueNum < comparison.benchmark.revenue_p25) {
              percentile = '<25th';
              status = 'warning';
            } else {
              percentile = '25th-75th';
              status = 'warning';
            }
            
            metrics.push({
              label: 'Revenue',
              dealValue: `$${(revenueNum / 1000000).toFixed(1)}M`,
              benchmarkValue: `$${(comparison.benchmark.revenue_median / 1000000).toFixed(1)}M`,
              percentile,
              status,
            });
          }
          
          setComparisons(metrics);
        }
      } catch (error) {
        console.error('Error loading benchmark:', error);
      } finally {
        setLoading(false);
      }
    }

    loadBenchmark();
  }, [deal]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Industry Benchmarks</h2>
        <div className="text-slate-600">Loading benchmark data...</div>
      </div>
    );
  }

  if (!benchmark) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Industry Benchmarks</h2>
        <div className="text-slate-600">
          {deal.industry 
            ? `No benchmark data available for ${deal.industry}`
            : 'Industry not specified for this deal'}
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: ComparisonMetric['status']) => {
    switch (status) {
      case 'good':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'poor':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: ComparisonMetric['status']) => {
    switch (status) {
      case 'good':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'warning':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'poor':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">
        Industry Benchmarks: {benchmark.industry}
      </h2>

      {comparisons.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Metric</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">This Deal</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Industry Median</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Percentile</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((metric, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{metric.label}</td>
                  <td className="py-3 px-4 text-sm text-right text-slate-900">{metric.dealValue}</td>
                  <td className="py-3 px-4 text-sm text-right text-slate-600">{metric.benchmarkValue}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${getStatusColor(metric.status)}`}>
                      {getStatusIcon(metric.status)}
                      {metric.percentile}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {keyRisks.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Key Industry Risks</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
            {keyRisks.map((risk, idx) => (
              <li key={idx}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      {keyValueDrivers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Key Value Drivers</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
            {keyValueDrivers.map((driver, idx) => (
              <li key={idx}>{driver}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
