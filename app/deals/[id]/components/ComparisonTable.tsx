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
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Select deals to compare</h4>
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {selectedDealIds.length === comparisonDeals.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {comparisonDeals.map((deal) => (
              <label
                key={deal.id}
                className="flex items-center gap-2 p-2 rounded border bg-white hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedDealIds.includes(deal.id)}
                  onChange={() => handleToggleDeal(deal.id)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm truncate flex-1">{deal.company_name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {displayDeals.length > 0 ? (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Industry
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Location
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  Revenue
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  EBITDA
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                  Tier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
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
                    className={`border-b border-slate-100 ${
                      isCurrentDeal ? 'bg-blue-50 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isCurrentDeal && (
                          <span className="text-xs text-blue-600 font-medium">Current</span>
                        )}
                        <span className={isCurrentDeal ? 'text-blue-900' : 'text-slate-900'}>
                          {deal.company_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {deal.industry || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {deal.location || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-700">
                      {deal.revenue || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-700">
                      {deal.ebitda || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {deal.tier && (deal.source_type === 'on_market' || deal.source_type === 'off_market') ? (
                        <TierBadge tier={deal.tier} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SourceBadge source={deal.source_type} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {safeDateLabel(deal.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          Select deals above to compare
        </div>
      )}
    </div>
  );
}
