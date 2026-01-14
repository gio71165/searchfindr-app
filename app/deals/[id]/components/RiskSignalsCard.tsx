export function RiskSignalsCard({ 
  scoring, 
  title = "Scoring Breakdown",
  subtitle 
}: { 
  scoring: any;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="card-section text-sm space-y-4">
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      {subtitle && <p className="text-[11px] opacity-70">{subtitle}</p>}

      {Object.keys(scoring).length === 0 ? (
        <p className="text-sm opacity-80">No structured signals stored yet.</p>
      ) : (
        <>
          {scoring.succession_risk && (
            <div>
              <p className="font-semibold">Key-person risk</p>
              <p>{scoring.succession_risk}</p>
              <p className="text-xs text-muted-foreground">{scoring.succession_risk_reason}</p>
            </div>
          )}
          {scoring.industry_fit && (
            <div>
              <p className="font-semibold">Industry alignment</p>
              <p>{scoring.industry_fit}</p>
              <p className="text-xs text-muted-foreground">{scoring.industry_fit_reason}</p>
            </div>
          )}
          {scoring.geography_fit && (
            <div>
              <p className="font-semibold">Geographic considerations</p>
              <p>{scoring.geography_fit}</p>
              <p className="text-xs text-muted-foreground">{scoring.geography_fit_reason}</p>
            </div>
          )}
          {scoring.financial_quality && (
            <div>
              <p className="font-semibold">Financial statement quality</p>
              <p>{scoring.financial_quality}</p>
              <p className="text-xs text-muted-foreground">{scoring.financial_quality_reason}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
