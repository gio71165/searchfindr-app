'use client';

import { TierBadge } from './TierBadge';
import { SourceBadge } from './SourceBadge';
import { safeDateLabel } from '../lib/formatters';

export interface ComparisonDeal {
  id: string;
  company_name: string;
  industry: string | null;
  location: string | null;
  revenue: string | null;
  ebitda: string | null;
  tier: string | null;
  created_at: string;
  source_type: string | null;
}

interface ComparisonTableProps {
  currentDeal: ComparisonDeal;
  comparisonDeals: ComparisonDeal[];
  selectedDealIds: string[];
  onSelectionChange: (dealIds: string[]) => void;
}

export function ComparisonTable({
  currentDeal,
  comparisonDeals,
  selectedDealIds,
  onSelectionChange,
}: ComparisonTableProps) {
  const handleToggleDeal = (dealId: string) => {
    if (selectedDealIds.includes(dealId)) {
      onSelectionChange(selectedDealIds.filter((id) => id !== dealId));
    } else {
      onSelectionChange([...selectedDealIds, dealId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedDealIds.length === comparisonDeals.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(comparisonDeals.map((d) => d.id));
    }
  };

  const displayDeals = [currentDeal, ...comparisonDeals.filter((d) => selectedDealIds.includes(d.id))];

  return (
    <div className="space-y-4">
      {/* Deal Selection */}
      {comparisonDeals.length > 0 && (
        <div className="border border-slate-600 rounded-lg p-4 bg-slate-800/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-50">Select deals to compare</h4>
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {selectedDealIds.length === comparisonDeals.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {comparisonDeals.map((deal) => (
              <label
                key={deal.id}
                className="flex items-center gap-2 p-2 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedDealIds.includes(deal.id)}
                  onChange={() => handleToggleDeal(deal.id)}
                  className="rounded border-slate-500 bg-slate-800 text-emerald-500"
                />
                <span className="text-sm text-slate-200 truncate flex-1">{deal.company_name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {displayDeals.length > 0 ? (
        <div className="overflow-x-auto border border-slate-600 rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-700/50 border-b border-slate-600">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                  Industry
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                  Location
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                  Revenue
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                  EBITDA
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">
                  Tier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                  Added
                </th>
              </tr>
            </thead>
            <tbody>
              {displayDeals.map((deal) => {
                const isCurrentDeal = deal.id === currentDeal.id;
                return (
                  <tr
                    key={deal.id}
                    className={`border-b border-slate-600 ${
                      isCurrentDeal ? 'bg-blue-500/20 font-semibold' : 'hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isCurrentDeal && (
                          <span className="text-xs text-blue-400 font-medium">Current</span>
                        )}
                        <span className={isCurrentDeal ? 'text-blue-200' : 'text-slate-200'}>
                          {deal.company_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {deal.industry || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {deal.location || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-300">
                      {deal.revenue || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-300">
                      {deal.ebitda || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {deal.tier && (deal.source_type === 'on_market' || deal.source_type === 'off_market') ? (
                        <TierBadge tier={deal.tier} />
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SourceBadge source={deal.source_type} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {safeDateLabel(deal.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400">
          Select deals above to compare
        </div>
      )}
    </div>
  );
}
