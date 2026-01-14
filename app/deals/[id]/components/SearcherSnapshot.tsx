export function SearcherSnapshot({ criteria }: { criteria: any }) {
  return (
    <div className="card-section text-sm space-y-3">
      <h2 className="text-lg font-semibold mb-1">Searcher Snapshot</h2>

      {!criteria || Object.keys(criteria).length === 0 ? (
        <p className="text-sm">No criteria analysis yet.</p>
      ) : (
        <>
          {criteria.deal_size && (
            <div>
              <p className="font-semibold">Deal Size Fit</p>
              <p>{criteria.deal_size || '—'}</p>
            </div>
          )}

          <div>
            <p className="font-semibold">Business Model</p>
            <p>{criteria.business_model || '—'}</p>
          </div>

          <div>
            <p className="font-semibold">Owner Profile</p>
            <p>{criteria.owner_profile || '—'}</p>
          </div>

          {criteria.platform_vs_addon && (
            <div>
              <p className="font-semibold">Platform vs Add-on</p>
              <p>{criteria.platform_vs_addon || '—'}</p>
            </div>
          )}

          {criteria.moat_summary && (
            <div>
              <p className="font-semibold">Moat / Differentiation</p>
              <p>{criteria.moat_summary || '—'}</p>
            </div>
          )}

          {criteria.integration_risks && (
            <div>
              <p className="font-semibold">Integration Risks</p>
              <p>{criteria.integration_risks || '—'}</p>
            </div>
          )}

          <div>
            <p className="font-semibold">Notes for Searcher</p>
            <p>{criteria.notes_for_searcher || '—'}</p>
          </div>
        </>
      )}
    </div>
  );
}
