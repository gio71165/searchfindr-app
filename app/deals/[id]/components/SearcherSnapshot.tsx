import type { CriteriaMatch } from '@/lib/types/deal';

export function SearcherSnapshot({ criteria }: { criteria: CriteriaMatch | null }) {
  return (
    <div className="text-sm space-y-3">
      {!criteria || Object.keys(criteria).length === 0 ? (
        <p className="text-emerald-700">No criteria analysis yet.</p>
      ) : (
        <div className="space-y-3">
          {criteria.deal_size && (
            <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
              <p className="font-semibold text-emerald-900 mb-1">Deal Size Fit</p>
              <p className="text-emerald-700">{criteria.deal_size || '—'}</p>
            </div>
          )}

          <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
            <p className="font-semibold text-emerald-900 mb-1">Business Model</p>
            <p className="text-emerald-700">{criteria.business_model || '—'}</p>
          </div>

          <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
            <p className="font-semibold text-emerald-900 mb-1">Owner Profile</p>
            <p className="text-emerald-700">{criteria.owner_profile || '—'}</p>
          </div>

          {(() => {
            const criteriaAny = criteria as Record<string, unknown>;
            const platform = criteriaAny.platform_vs_addon;
            return platform && typeof platform === 'string' ? (
              <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
                <p className="font-semibold text-emerald-900 mb-1">Platform vs Add-on</p>
                <p className="text-emerald-700">{platform || '—'}</p>
              </div>
            ) : null;
          })()}

          {(() => {
            const criteriaAny = criteria as Record<string, unknown>;
            const moat = criteriaAny.moat_summary;
            return moat && typeof moat === 'string' ? (
              <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
                <p className="font-semibold text-emerald-900 mb-1">Moat / Differentiation</p>
                <p className="text-emerald-700">{moat || '—'}</p>
              </div>
            ) : null;
          })()}

          {(() => {
            const criteriaAny = criteria as Record<string, unknown>;
            const risks = criteriaAny.integration_risks;
            return risks && typeof risks === 'string' ? (
              <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
                <p className="font-semibold text-emerald-900 mb-1">Integration Risks</p>
                <p className="text-emerald-700">{risks || '—'}</p>
              </div>
            ) : null;
          })()}

          <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
            <p className="font-semibold text-emerald-900 mb-1">Notes for Searcher</p>
            <p className="text-emerald-700">{criteria.notes_for_searcher || '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
