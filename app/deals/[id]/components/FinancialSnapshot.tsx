import { DollarSign } from 'lucide-react';
import type { FinancialMetrics, Deal } from '@/lib/types/deal';

export function FinancialSnapshot({ 
  fin, 
  deal 
}: { 
  fin: FinancialMetrics | null; 
  deal?: Deal | null;
}) {
  const revenue = fin?.revenue || deal?.ai_financials_json?.revenue || 'Unknown';
  const ebitda = fin?.ebitda || deal?.ai_financials_json?.ebitda || 'Unknown';
  const margin = fin?.margin || null;
  const benchmarks = fin?.industry_benchmark || null;

  const formatBenchmark = (value: string | number, range: string, withinRange: boolean) => {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-700 dark:text-slate-300">
          {value} (Industry: {range})
        </span>
        <span className={withinRange ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
          {withinRange ? '✅' : '⚠️'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Financial Details</h3>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">TTM Revenue</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">{revenue}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">TTM EBITDA</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">{ebitda}</p>
          </div>

          {fin.margin && (
            <div>
              <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">EBITDA Margin</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{fin.margin}</p>
            </div>
          )}

          {fin.revenue_1y_ago && (
            <div>
              <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">Revenue (1Y ago)</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{fin.revenue_1y_ago}</p>
            </div>
          )}

          {fin.revenue_2y_ago && (
            <div>
              <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">Revenue (2Y ago)</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{fin.revenue_2y_ago}</p>
            </div>
          )}

          {fin.revenue_cagr_3y && (
            <div>
              <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">3Y Revenue CAGR</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{fin.revenue_cagr_3y}</p>
            </div>
          )}

          {fin.customer_concentration && (
            <div>
              <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">Customer Concentration</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{fin.customer_concentration}</p>
            </div>
          )}

          {fin.capex_intensity && (
            <div>
              <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">Capex Intensity</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{fin.capex_intensity}</p>
            </div>
          )}

          {fin.working_capital_needs && (
            <div>
              <p className="text-xs uppercase text-slate-600 dark:text-slate-400 mb-1">Working Capital</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{fin.working_capital_needs}</p>
            </div>
          )}
        </div>

        {/* Industry Benchmarks */}
        {benchmarks && typeof benchmarks === 'object' && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Industry Benchmarks</h4>
            <div className="space-y-2">
              {benchmarks.ebitda_multiple && (
                formatBenchmark(
                  benchmarks.ebitda_multiple.value || benchmarks.ebitda_multiple,
                  benchmarks.ebitda_multiple.range || benchmarks.ebitda_multiple,
                  benchmarks.ebitda_multiple.withinRange !== false
                )
              )}
              {benchmarks.ebitda_margin && (
                formatBenchmark(
                  benchmarks.ebitda_margin.value || benchmarks.ebitda_margin,
                  benchmarks.ebitda_margin.range || benchmarks.ebitda_margin,
                  benchmarks.ebitda_margin.withinRange !== false
                )
              )}
              {benchmarks.growth_rate && (
                formatBenchmark(
                  benchmarks.growth_rate.value || benchmarks.growth_rate,
                  benchmarks.growth_rate.range || benchmarks.growth_rate,
                  benchmarks.growth_rate.withinRange !== false
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
