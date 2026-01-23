'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearcherMetrics } from '@/lib/data-access/investor-analytics';
import { Eye, TrendingUp } from 'lucide-react';

interface SearcherPerformanceProps {
  searchers: SearcherMetrics[];
}

export default function SearcherPerformance({ searchers }: SearcherPerformanceProps) {
  const router = useRouter();
  const [expandedSearcher, setExpandedSearcher] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleViewDetails = (searcher: SearcherMetrics) => {
    router.push(`/investor/searchers/${searcher.searcherId}?workspace=${searcher.workspaceId}`);
  };

  if (searchers.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-600">No searchers linked to your account yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Searcher Performance</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Searcher
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Capital Committed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Months Searching
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Deals Reviewed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Pipeline Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                CIM → IOI Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {searchers.map((searcher) => (
              <tr key={searcher.searcherId} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {searcher.searcherName}
                    </div>
                    <div className="text-sm text-slate-500">{searcher.searcherEmail}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {formatCurrency(searcher.capitalCommitted)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {searcher.monthsSearching}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  <div>{searcher.cimsReviewedTotal} total</div>
                  <div className="text-xs text-slate-500">
                    {searcher.cimsReviewedThisMonth} this month
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  <div>{formatCurrency(searcher.totalPipelineValue)}</div>
                  <div className="text-xs text-slate-500">
                    {searcher.dealsInPipeline} deals
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span>{searcher.conversionRates.cimToIoi.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  <div>{formatDate(searcher.lastActivity)}</div>
                  <div className="text-xs text-slate-500 capitalize">
                    {searcher.lastActivityType.replace(/_/g, ' ')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleViewDetails(searcher)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
