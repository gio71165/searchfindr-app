import { DollarSign } from 'lucide-react';
import type { FinancialMetrics, Deal } from '@/lib/types/deal';
import { FinancialTable, type FinancialTableData } from './FinancialTable';

export function FinancialSnapshot({ 
  fin, 
  deal 
}: { 
  fin: FinancialMetrics | null; 
  deal?: Deal | null;
}) {
  // Prefer CIM/deal-level so display matches Executive Summary and Scenario Analysis
  const revenueRaw = deal?.revenue_ttm_extracted ?? fin?.revenue ?? (deal?.ai_financials_json as Record<string, unknown>)?.revenue;
  const revenue = typeof revenueRaw === 'string'
    ? revenueRaw
    : Array.isArray(revenueRaw) && revenueRaw.length > 0
      ? revenueRaw[0]?.value ? `${revenueRaw[0].value} ${revenueRaw[0].unit || ''}`.trim() : 'Unknown'
      : 'Unknown';

  const ebitdaRaw = deal?.ebitda_ttm_extracted ?? fin?.ebitda ?? (deal?.ai_financials_json as Record<string, unknown>)?.ebitda;
  const ebitda = typeof ebitdaRaw === 'string'
    ? ebitdaRaw
    : Array.isArray(ebitdaRaw) && ebitdaRaw.length > 0
      ? ebitdaRaw[0]?.value ? `${ebitdaRaw[0].value} ${ebitdaRaw[0].unit || ''}`.trim() : 'Unknown'
      : 'Unknown';
  
  const margin = typeof fin?.margin === 'string' ? fin.margin : null;
  const benchmarks = fin?.industry_benchmark || null;

  const formatBenchmark = (value: string | number, range: string, withinRange: boolean) => {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-300">
          {value} (Industry: {range})
        </span>
        <span className={withinRange ? 'text-emerald-400' : 'text-amber-400'}>
          {withinRange ? '✅' : '⚠️'}
        </span>
      </div>
    );
  };

  const MetricCard = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 transition-colors hover:border-slate-600 hover:bg-slate-800">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      <p className="text-base font-semibold text-slate-50">{value}</p>
    </div>
  );

  const metrics: Array<{ label: string; value: string }> = [
    { label: 'TTM Revenue', value: revenue },
    { label: 'TTM EBITDA', value: ebitda },
    ...(margin ? [{ label: 'EBITDA Margin', value: margin }] : []),
    ...(fin && typeof (fin as Record<string, unknown>).revenue_1y_ago === 'string' && (fin as Record<string, unknown>).revenue_1y_ago
      ? [{ label: 'Revenue (1Y ago)', value: (fin as Record<string, unknown>).revenue_1y_ago as string }] : []),
    ...(fin && typeof (fin as Record<string, unknown>).revenue_2y_ago === 'string' && (fin as Record<string, unknown>).revenue_2y_ago
      ? [{ label: 'Revenue (2Y ago)', value: (fin as Record<string, unknown>).revenue_2y_ago as string }] : []),
    ...(fin && typeof (fin as Record<string, unknown>).revenue_cagr_3y === 'string' && (fin as Record<string, unknown>).revenue_cagr_3y
      ? [{ label: '3Y Revenue CAGR', value: (fin as Record<string, unknown>).revenue_cagr_3y as string }] : []),
    ...(fin?.customer_concentration && typeof fin.customer_concentration === 'string'
      ? [{ label: 'Customer Concentration', value: fin.customer_concentration }] : []),
    ...(fin && typeof (fin as Record<string, unknown>).capex_intensity === 'string' && (fin as Record<string, unknown>).capex_intensity
      ? [{ label: 'Capex Intensity', value: (fin as Record<string, unknown>).capex_intensity as string }] : []),
    ...(fin && typeof (fin as Record<string, unknown>).working_capital_needs === 'string' && (fin as Record<string, unknown>).working_capital_needs
      ? [{ label: 'Working Capital', value: (fin as Record<string, unknown>).working_capital_needs as string }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-50">Financial Details</h3>
            <p className="text-sm text-slate-400">Key metrics from the deal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} label={m.label} value={m.value} />
          ))}
        </div>

        {/* Industry Benchmarks */}
        {benchmarks && typeof benchmarks === 'object' && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <h4 className="text-sm font-semibold text-slate-50 mb-3">Industry Benchmarks</h4>
                <div className="space-y-2">
                  {(() => {
                    const bm = benchmarks as Record<string, unknown>;
                    const multiple = bm.ebitda_multiple;
                    if (multiple && typeof multiple === 'object') {
                      const m = multiple as { value?: string | number; range?: string; withinRange?: boolean };
                      return formatBenchmark(
                        m.value || '',
                        m.range || '',
                        m.withinRange !== false
                      );
                    }
                    return null;
                  })()}
                  {(() => {
                    const bm = benchmarks as Record<string, unknown>;
                    const margin = bm.ebitda_margin;
                    if (margin && typeof margin === 'object') {
                      const m = margin as { value?: string | number; range?: string; withinRange?: boolean };
                      return formatBenchmark(
                        m.value || '',
                        m.range || '',
                        m.withinRange !== false
                      );
                    }
                    return null;
                  })()}
                  {(() => {
                    const bm = benchmarks as Record<string, unknown>;
                    const growth = bm.growth_rate;
                    if (growth && typeof growth === 'object') {
                      const g = growth as { value?: string | number; range?: string; withinRange?: boolean };
                      return formatBenchmark(
                        g.value || '',
                        g.range || '',
                        g.withinRange !== false
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            )}

      </div>

      {/* Financial Tables */}
      {(() => {
        const financialTables = (fin as any)?.financial_tables || (deal?.ai_financials_json as any)?.financial_tables;
        
        if (!financialTables || !Array.isArray(financialTables) || financialTables.length === 0) {
          return null;
        }

        return (
          <div className="space-y-6">
            {financialTables.map((table: FinancialTableData, idx: number) => (
              <FinancialTable key={idx} table={table} />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
