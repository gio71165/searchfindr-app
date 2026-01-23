'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearcherMetrics } from '@/lib/data-access/investor-analytics';
import { Eye, TrendingUp, Edit2, Check, X } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import { AsyncButton } from '@/components/ui/AsyncButton';

interface SearcherPerformanceProps {
  searchers: SearcherMetrics[];
  onSearcherUpdate?: () => void; // Callback to refresh dashboard data
}

export default function SearcherPerformance({ searchers, onSearcherUpdate }: SearcherPerformanceProps) {
  const router = useRouter();
  const [expandedSearcher, setExpandedSearcher] = useState<string | null>(null);
  const [editingSearcher, setEditingSearcher] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [saving, setSaving] = useState(false);

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

  const handleStartEdit = (searcher: SearcherMetrics) => {
    setEditingSearcher(searcher.linkId);
    setEditName(searcher.searcherName);
  };

  const handleCancelEdit = () => {
    setEditingSearcher(null);
    setEditName('');
  };

  const handleSaveEdit = async (linkId: string) => {
    if (saving) return;
    
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Not authenticated', 'error', 3000);
        return;
      }

      const res = await fetch(`/api/investor/links/${linkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          custom_display_name: editName.trim() || null,
        }),
      });

      let data;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error(`Server returned invalid response (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed to update searcher name (${res.status})`);
      }

      showToast('Searcher name updated', 'success', 2000);
      setEditingSearcher(null);
      setEditName('');
      
      // Refresh dashboard data
      if (onSearcherUpdate) {
        onSearcherUpdate();
      }
    } catch (err) {
      console.error('Error updating searcher name:', err);
      showToast(err instanceof Error ? err.message : 'Failed to update searcher name', 'error', 3000);
    } finally {
      setSaving(false);
    }
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
                Searcher (click to edit name)
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
                  {editingSearcher === searcher.linkId ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(searcher.linkId);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        className="px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                        disabled={saving}
                      />
                      <AsyncButton
                        onClick={() => handleSaveEdit(searcher.linkId)}
                        isLoading={saving}
                        className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </AsyncButton>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="group cursor-pointer"
                      onClick={() => handleStartEdit(searcher)}
                      title="Click to edit name"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-slate-900">
                          {searcher.searcherName}
                        </div>
                        <Edit2 className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-sm text-slate-500">{searcher.searcherEmail}</div>
                    </div>
                  )}
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
