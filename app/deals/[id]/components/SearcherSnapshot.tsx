import type { CriteriaMatch } from '@/lib/types/deal';

export function SearcherSnapshot({ criteria }: { criteria: CriteriaMatch | null }) {
  return (
    <div className="text-sm space-y-4">
      {!criteria || Object.keys(criteria).length === 0 ? (
        <p className="text-slate-600">No criteria analysis yet.</p>
      ) : (
        <div className="space-y-4">
          {criteria.deal_size && (
            <div>
              <p className="font-semibold text-slate-900">Deal Size Fit</p>
              <p className="text-slate-700">{criteria.deal_size || '—'}</p>
            </div>
          )}

          <div>
            <p className="font-semibold text-slate-900">Business Model</p>
            <p className="text-slate-700">{criteria.business_model || '—'}</p>
          </div>

          <div>
            <p className="font-semibold text-slate-900">Owner Profile</p>
            <p className="text-slate-700">{criteria.owner_profile || '—'}</p>
          </div>

          {(() => {
            const criteriaAny = criteria as Record<string, unknown>;
            const platform = criteriaAny.platform_vs_addon;
            return platform && typeof platform === 'string' ? (
              <div>
                <p className="font-semibold text-slate-900">Platform vs Add-on</p>
                <p className="text-slate-700">{platform || '—'}</p>
              </div>
            ) : null;
          })()}

          {(() => {
            const criteriaAny = criteria as Record<string, unknown>;
            const moat = criteriaAny.moat_summary;
            return moat && typeof moat === 'string' ? (
              <div>
                <p className="font-semibold text-slate-900">Moat / Differentiation</p>
                <p className="text-slate-700">{moat || '—'}</p>
              </div>
            ) : null;
          })()}

          {(() => {
            const criteriaAny = criteria as Record<string, unknown>;
            const risks = criteriaAny.integration_risks;
            return risks && typeof risks === 'string' ? (
              <div>
                <p className="font-semibold text-slate-900">Integration Risks</p>
                <p className="text-slate-700">{risks || '—'}</p>
              </div>
            ) : null;
          })()}

          <div>
            <p className="font-semibold text-slate-900">Notes for Searcher</p>
            <p className="text-slate-700">{criteria.notes_for_searcher || '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
