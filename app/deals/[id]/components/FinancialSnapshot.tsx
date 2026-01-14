export function FinancialSnapshot({ 
  fin, 
  deal 
}: { 
  fin: any; 
  deal?: any;
}) {
  return (
    <div className="card-section space-y-3 text-sm">
      <h2 className="text-lg font-semibold mb-2">Financial Snapshot</h2>

      <div>
        <p className="text-xs uppercase">TTM Revenue</p>
        <p className="font-medium">{fin.revenue || deal?.revenue || 'Unknown'}</p>
      </div>

      <div>
        <p className="text-xs uppercase">TTM EBITDA</p>
        <p className="font-medium">{fin.ebitda || deal?.ebitda || 'Unknown'}</p>
      </div>

      {fin.margin && (
        <div>
          <p className="text-xs uppercase">EBITDA Margin</p>
          <p className="font-medium">{fin.margin}</p>
        </div>
      )}

      {fin.revenue_1y_ago && (
        <div>
          <p className="text-xs uppercase">Revenue (1Y ago)</p>
          <p className="font-medium">{fin.revenue_1y_ago}</p>
        </div>
      )}

      {fin.revenue_2y_ago && (
        <div>
          <p className="text-xs uppercase">Revenue (2Y ago)</p>
          <p className="font-medium">{fin.revenue_2y_ago}</p>
        </div>
      )}

      {fin.revenue_cagr_3y && (
        <div>
          <p className="text-xs uppercase">3Y Revenue CAGR</p>
          <p className="font-medium">{fin.revenue_cagr_3y}</p>
        </div>
      )}

      {fin.customer_concentration && (
        <div>
          <p className="text-xs uppercase">Customer Concentration</p>
          <p className="font-medium">{fin.customer_concentration}</p>
        </div>
      )}

      {fin.capex_intensity && (
        <div>
          <p className="text-xs uppercase">Capex Intensity</p>
          <p className="font-medium">{fin.capex_intensity}</p>
        </div>
      )}

      {fin.working_capital_needs && (
        <div>
          <p className="text-xs uppercase">Working Capital</p>
          <p className="font-medium">{fin.working_capital_needs}</p>
        </div>
      )}
    </div>
  );
}
