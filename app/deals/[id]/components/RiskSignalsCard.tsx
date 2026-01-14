export function RiskSignalsCard({ 
  scoring, 
  title = "",
  subtitle 
}: { 
  scoring: any;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="text-sm space-y-4">
      {title && <h2 className="text-lg font-semibold mb-1">{title}</h2>}
      {subtitle && <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">{subtitle}</p>}

      {Object.keys(scoring).length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">No structured signals stored yet.</p>
      ) : (
        <div className="space-y-4">
          {scoring.succession_risk && (
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Key-person risk</p>
              <p className="text-slate-700 dark:text-slate-300">{scoring.succession_risk}</p>
              {scoring.succession_risk_reason && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{scoring.succession_risk_reason}</p>
              )}
            </div>
          )}
          {scoring.industry_fit && (
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Industry alignment</p>
              <p className="text-slate-700 dark:text-slate-300">{scoring.industry_fit}</p>
              {scoring.industry_fit_reason && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{scoring.industry_fit_reason}</p>
              )}
            </div>
          )}
          {scoring.geography_fit && (
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Geographic considerations</p>
              <p className="text-slate-700 dark:text-slate-300">{scoring.geography_fit}</p>
              {scoring.geography_fit_reason && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{scoring.geography_fit_reason}</p>
              )}
            </div>
          )}
          {scoring.financial_quality && (
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Financial statement quality</p>
              <p className="text-slate-700 dark:text-slate-300">{scoring.financial_quality}</p>
              {scoring.financial_quality_reason && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{scoring.financial_quality_reason}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
