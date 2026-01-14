export function SearcherSnapshot({ criteria }: { criteria: any }) {
  return (
    <div className="text-sm space-y-4">
      {!criteria || Object.keys(criteria).length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400">No criteria analysis yet.</p>
      ) : (
        <div className="space-y-4">
          {criteria.deal_size && (
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Deal Size Fit</p>
              <p className="text-slate-700 dark:text-slate-300">{criteria.deal_size || '—'}</p>
            </div>
          )}

          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Business Model</p>
            <p className="text-slate-700 dark:text-slate-300">{criteria.business_model || '—'}</p>
          </div>

          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Owner Profile</p>
            <p className="text-slate-700 dark:text-slate-300">{criteria.owner_profile || '—'}</p>
          </div>

          {criteria.platform_vs_addon && (
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Platform vs Add-on</p>
              <p className="text-slate-700 dark:text-slate-300">{criteria.platform_vs_addon || '—'}</p>
            </div>
          )}

          {criteria.moat_summary && (
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Moat / Differentiation</p>
              <p className="text-slate-700 dark:text-slate-300">{criteria.moat_summary || '—'}</p>
            </div>
          )}

          {criteria.integration_risks && (
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Integration Risks</p>
              <p className="text-slate-700 dark:text-slate-300">{criteria.integration_risks || '—'}</p>
            </div>
          )}

          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Notes for Searcher</p>
            <p className="text-slate-700 dark:text-slate-300">{criteria.notes_for_searcher || '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
