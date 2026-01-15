import { DollarSign } from 'lucide-react';
import type { FinancialMetrics, Deal } from '@/lib/types/deal';

export function FinancialSnapshot({ 
  fin, 
  deal 
}: { 
  fin: FinancialMetrics | null; 
  deal?: Deal | null;
}) {
  const revenueRaw = fin?.revenue || deal?.ai_financials_json?.revenue;
  const revenue = typeof revenueRaw === 'string' 
    ? revenueRaw 
    : Array.isArray(revenueRaw) && revenueRaw.length > 0
      ? revenueRaw[0]?.value ? `${revenueRaw[0].value} ${revenueRaw[0].unit || ''}`.trim() : 'Unknown'
      : 'Unknown';
  
  const ebitdaRaw = fin?.ebitda || deal?.ai_financials_json?.ebitda;
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
        <span className="text-slate-700">
          {value} (Industry: {range})
        </span>
        <span className={withinRange ? 'text-green-600' : 'text-yellow-600'}>
          {withinRange ? '✅' : '⚠️'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-slate-600" />
          <h3 className="text-xl font-semibold text-slate-900">Financial Details</h3>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-600 mb-1">TTM Revenue</p>
            <p className="font-medium text-slate-900">{revenue}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-600 mb-1">TTM EBITDA</p>
            <p className="font-medium text-slate-900">{ebitda}</p>
          </div>

          {margin && (
            <div>
              <p className="text-xs uppercase text-slate-600 mb-1">EBITDA Margin</p>
              <p className="font-medium text-slate-900">{margin}</p>
            </div>
          )}

          {fin && (() => {
            const finAny = fin as Record<string, unknown>;
            const rev1y = finAny.revenue_1y_ago;
            return typeof rev1y === 'string' && rev1y ? (
              <div>
                <p className="text-xs uppercase text-slate-600 mb-1">Revenue (1Y ago)</p>
                <p className="font-medium text-slate-900">{rev1y}</p>
              </div>
            ) : null;
          })()}

          {fin && (() => {
            const finAny = fin as Record<string, unknown>;
            const rev2y = finAny.revenue_2y_ago;
            return typeof rev2y === 'string' && rev2y ? (
              <div>
                <p className="text-xs uppercase text-slate-600 mb-1">Revenue (2Y ago)</p>
                <p className="font-medium text-slate-900">{rev2y}</p>
              </div>
            ) : null;
          })()}

          {fin && (() => {
            const finAny = fin as Record<string, unknown>;
            const cagr = finAny.revenue_cagr_3y;
            return typeof cagr === 'string' && cagr ? (
              <div>
                <p className="text-xs uppercase text-slate-600 mb-1">3Y Revenue CAGR</p>
                <p className="font-medium text-slate-900">{cagr}</p>
              </div>
            ) : null;
          })()}

          {fin?.customer_concentration && typeof fin.customer_concentration === 'string' && (
            <div>
              <p className="text-xs uppercase text-slate-600 mb-1">Customer Concentration</p>
              <p className="font-medium text-slate-900">{fin.customer_concentration}</p>
            </div>
          )}

          {fin && (() => {
            const finAny = fin as Record<string, unknown>;
            const capex = finAny.capex_intensity;
            return typeof capex === 'string' && capex ? (
              <div>
                <p className="text-xs uppercase text-slate-600 mb-1">Capex Intensity</p>
                <p className="font-medium text-slate-900">{capex}</p>
              </div>
            ) : null;
          })()}

          {fin && (() => {
            const finAny = fin as Record<string, unknown>;
            const wc = finAny.working_capital_needs;
            return typeof wc === 'string' && wc ? (
              <div>
                <p className="text-xs uppercase text-slate-600 mb-1">Working Capital</p>
                <p className="font-medium text-slate-900">{wc}</p>
              </div>
            ) : null;
          })()}
        </div>

        {/* Industry Benchmarks */}
        {benchmarks && typeof benchmarks === 'object' && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Industry Benchmarks</h4>
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
    </div>
  );
}
