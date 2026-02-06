import type { DealScoring } from '@/lib/types/deal';

export function RiskSignalsCard({ 
  scoring, 
  title = "",
  subtitle 
}: { 
  scoring: DealScoring | null;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="text-sm space-y-4">
      {title && <h2 className="text-lg font-semibold text-slate-50 mb-1">{title}</h2>}
      {subtitle && <p className="text-xs text-slate-400 mb-4">{subtitle}</p>}

      {!scoring || Object.keys(scoring).length === 0 ? (
        <p className="text-sm text-slate-400">No structured signals stored yet.</p>
      ) : (
        <div className="space-y-4">
          {scoring.succession_risk && (
            <div>
              <p className="font-semibold text-slate-50">Key-person risk</p>
              <p className="text-slate-300">{scoring.succession_risk}</p>
              {scoring.succession_risk_reason && (
                <p className="text-xs text-slate-400 mt-1">{scoring.succession_risk_reason}</p>
              )}
            </div>
          )}
          {scoring.industry_fit && (
            <div>
              <p className="font-semibold text-slate-50">Industry alignment</p>
              <p className="text-slate-300">{scoring.industry_fit}</p>
              {scoring.industry_fit_reason && (
                <p className="text-xs text-slate-400 mt-1">{scoring.industry_fit_reason}</p>
              )}
            </div>
          )}
          {scoring.geography_fit && (
            <div>
              <p className="font-semibold text-slate-50">Geographic considerations</p>
              <p className="text-slate-300">{scoring.geography_fit}</p>
              {scoring.geography_fit_reason && (
                <p className="text-xs text-slate-400 mt-1">{scoring.geography_fit_reason}</p>
              )}
            </div>
          )}
          {scoring.operational_quality_signal && (
            <div>
              <p className="font-semibold text-slate-50">Operational quality</p>
              <p className="text-slate-300">{scoring.operational_quality_signal}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
