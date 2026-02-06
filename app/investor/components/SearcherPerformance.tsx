'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SearcherMetrics } from '@/lib/data-access/investor-analytics';
import { Eye, TrendingUp, Edit2, Check, X, Users } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import { AsyncButton } from '@/components/ui/AsyncButton';

interface SearcherPerformanceProps {
  searchers: SearcherMetrics[];
  onSearcherUpdate?: () => void; // Callback to refresh dashboard data
  onLinkSearcher?: () => void; // Callback to open link searcher modal
}

export default function SearcherPerformance({ searchers, onSearcherUpdate, onLinkSearcher }: SearcherPerformanceProps) {
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
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <Users className="h-12 w-12 text-slate-500 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-slate-50 mb-2">No searchers linked yet</h3>
          <p className="text-slate-400 mb-6">
            Link searchers to your account to start monitoring their progress, pipeline, and performance metrics.
          </p>
          {onLinkSearcher ? (
            <button
              onClick={onLinkSearcher}
              className="btn-secondary inline-flex items-center gap-2 text-sm font-medium"
            >
              Link Your First Searcher
            </button>
          ) : (
            <button
              onClick={() => {
                // Trigger link modal from parent via event
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('investor:open-link-modal'));
                }
              }}
              className="btn-secondary inline-flex items-center gap-2 text-sm font-medium"
            >
              Link Your First Searcher
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-xl font-semibold text-slate-50">Searcher Performance</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/50 border-b border-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Searcher (click to edit name)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Capital Committed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Months Searching
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Deals Reviewed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Pipeline Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                CIM → IOI Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {searchers.map((searcher) => (
              <tr key={searcher.searcherId} className="hover:bg-slate-700/50">
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
                        className="px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        autoFocus
                        disabled={saving}
                      />
                      <AsyncButton
                        onClick={() => handleSaveEdit(searcher.linkId)}
                        isLoading={saving}
                        className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded transition-colors"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </AsyncButton>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
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
                        <div className="text-sm font-medium text-slate-50">
                          {searcher.searcherName}
                        </div>
                        <Edit2 className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-sm text-slate-500">{searcher.searcherEmail}</div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {formatCurrency(searcher.capitalCommitted)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {searcher.monthsSearching}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  <div>{searcher.cimsReviewedTotal} total</div>
                  <div className="text-xs text-slate-500">
                    {searcher.cimsReviewedThisMonth} this month
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  <div>{formatCurrency(searcher.totalPipelineValue)}</div>
                  <div className="text-xs text-slate-500">
                    {searcher.dealsInPipeline} deals
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span>{searcher.conversionRates.cimToIoi.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  <div>{formatDate(searcher.lastActivity)}</div>
                  <div className="text-xs text-slate-500 capitalize">
                    {searcher.lastActivityType.replace(/_/g, ' ')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {searcher.searcherId && searcher.workspaceId ? (
                    <Link
                      href={`/investor/searchers/${searcher.searcherId}?workspace=${searcher.workspaceId}`}
                      className="inline-flex items-center gap-2 px-3 py-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Link>
                  ) : (
                    <span className="text-slate-400 text-xs">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
