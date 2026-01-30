'use client';

import { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Download,
  User,
  Calendar,
  FileCheck
} from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { getDDProgress, type DDProgress, type DDItem } from '@/lib/data-access/dd-tracker';
import { showToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type StatusFilter = 'all' | 'not_started' | 'requested' | 'received' | 'reviewed' | 'issue_found' | 'cleared';

export function DDTracker({ dealId }: { dealId: string }) {
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [progress, setProgress] = useState<DDProgress | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProgress = async () => {
    setLoading(true);
    try {
      const progressData = await getDDProgress(supabase, dealId);
      setProgress(progressData);
      
      // Auto-expand categories with issues
      if (progressData) {
        const categoriesWithIssues = new Set<string>();
        progressData.categories.forEach(cat => {
          if (cat.dd_items?.some(item => item.status === 'issue_found')) {
            categoriesWithIssues.add(cat.id);
          }
        });
        setExpandedCategories(categoriesWithIssues);
      }
    } catch (error) {
      console.error('Error loading DD progress:', error);
      showToast('Failed to load DD tracker', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dealId) {
      loadProgress();
    }
  }, [dealId]);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch(`/api/deals/${dealId}/dd/init`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to initialize' }));
        throw new Error(errorData.error || 'Failed to initialize DD checklist');
      }

      showToast('DD checklist initialized', 'success');
      await loadProgress();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize';
      showToast(errorMessage, 'error');
    } finally {
      setInitializing(false);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: DDItem['status']) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch(`/api/deals/${dealId}/dd/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      await loadProgress();
    } catch (error) {
      showToast('Failed to update status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleItemUpdate = async (itemId: string, updates: Partial<DDItem>) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch(`/api/deals/${dealId}/dd/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error('Failed to update item');
      }

      await loadProgress();
      setEditingItem(null);
    } catch (error) {
      showToast('Failed to update item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllRequested = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch(`/api/deals/${dealId}/dd/mark-all-requested`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to mark items as requested');
      }

      showToast('All items marked as requested', 'success');
      await loadProgress();
    } catch (error) {
      showToast('Failed to mark items as requested', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!progress) return;

    const csvRows: string[] = [];
    csvRows.push('Category,Item,Status,Assigned To,Requested Date,Received Date,Reviewed Date,Notes,Issue Description,Issue Severity');

    progress.categories.forEach(cat => {
      cat.dd_items?.forEach(item => {
        csvRows.push([
          `"${cat.name}"`,
          `"${item.name}"`,
          item.status,
          item.assigned_to || '',
          item.requested_date ? new Date(item.requested_date).toLocaleDateString() : '',
          item.received_date ? new Date(item.received_date).toLocaleDateString() : '',
          item.reviewed_date ? new Date(item.reviewed_date).toLocaleDateString() : '',
          `"${(item.notes || '').replace(/"/g, '""')}"`,
          `"${(item.issue_description || '').replace(/"/g, '""')}"`,
          item.issue_severity || '',
        ].join(','));
      });
    });

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DD_Tracker_${dealId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported to CSV', 'success');
  };

  const getStatusBadge = (status: DDItem['status']) => {
    const badges = {
      not_started: { icon: Clock, color: 'bg-slate-100 text-slate-700', label: 'Not Started' },
      requested: { icon: FileText, color: 'bg-blue-100 text-blue-700', label: 'Requested' },
      received: { icon: FileCheck, color: 'bg-yellow-100 text-yellow-700', label: 'Received' },
      reviewed: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700', label: 'Reviewed' },
      issue_found: { icon: AlertTriangle, color: 'bg-red-100 text-red-700', label: 'Issue Found' },
      cleared: { icon: CheckSquare, color: 'bg-emerald-100 text-emerald-700', label: 'Cleared' },
    };
    
    const badge = badges[status];
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const getSeverityBadge = (severity: DDItem['issue_severity']) => {
    if (!severity) return null;
    
    const colors = {
      blocker: 'bg-red-200 text-red-800',
      major: 'bg-orange-200 text-orange-800',
      minor: 'bg-yellow-200 text-yellow-800',
      info: 'bg-blue-200 text-blue-800',
    };
    
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity]}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const filteredCategories = progress?.categories.map(cat => ({
    ...cat,
    dd_items: cat.dd_items?.filter(item => 
      statusFilter === 'all' || item.status === statusFilter
    ) || [],
  })).filter(cat => cat.dd_items.length > 0 || statusFilter === 'all') || [];

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </div>
    );
  }

  if (!progress || progress.categories.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-slate-600" />
          <h3 className="text-xl font-semibold text-slate-900">Due Diligence Tracker</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-600 mb-4">No DD checklist initialized for this deal.</p>
          <button
            onClick={handleInitialize}
            disabled={initializing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {initializing ? (
              <>
                <LoadingSpinner size="sm" />
                Initializing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Initialize DD Checklist
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-600" />
          <h3 className="text-xl font-semibold text-slate-900">Due Diligence Tracker</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700">
              Progress: {progress.completedItems} / {progress.totalItems} items cleared ({progress.progressPercent}%)
            </span>
            {progress.issuesFound > 0 && (
              <span className="text-sm text-red-600 font-medium">
                {progress.issuesFound} issue{progress.issuesFound !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className="bg-emerald-600 h-3 rounded-full transition-all"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filter:</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="text-sm border rounded-lg px-3 py-1.5"
        >
          <option value="all">All Status</option>
          <option value="not_started">Not Started</option>
          <option value="requested">Requested</option>
          <option value="received">Received</option>
          <option value="reviewed">Reviewed</option>
          <option value="issue_found">Issues</option>
          <option value="cleared">Cleared</option>
        </select>
        <button
          onClick={handleMarkAllRequested}
          disabled={saving}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          Mark All as Requested
        </button>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {filteredCategories.map(category => {
          const isExpanded = expandedCategories.has(category.id);
          const items = category.dd_items || [];
          
          return (
            <div key={category.id} className="border rounded-lg">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  )}
                  <div className="text-left">
                    <h4 className="font-semibold text-slate-900">{category.name}</h4>
                    {category.description && (
                      <p className="text-sm text-slate-600">{category.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    {items.filter(i => i.status === 'cleared').length} / {items.length} cleared
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t p-4 space-y-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No items match the current filter</p>
                  ) : (
                    items.map(item => {
                      const isEditing = editingItem === item.id;
                      
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border ${
                            item.status === 'issue_found' ? 'border-red-200 bg-red-50' :
                            item.status === 'cleared' ? 'border-emerald-200 bg-emerald-50' :
                            'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={item.status === 'cleared'}
                              onChange={(e) => {
                                handleStatusChange(item.id, e.target.checked ? 'cleared' : 'not_started');
                              }}
                              className="mt-1 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      defaultValue={item.name}
                                      onBlur={(e) => {
                                        if (e.target.value !== item.name) {
                                          handleItemUpdate(item.id, { name: e.target.value });
                                        }
                                      }}
                                      className="w-full border rounded px-2 py-1 text-sm font-medium"
                                      autoFocus
                                    />
                                  ) : (
                                    <h5
                                      className="font-medium text-slate-900 cursor-pointer hover:text-blue-600"
                                      onClick={() => setEditingItem(item.id)}
                                    >
                                      {item.name}
                                    </h5>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(item.status)}
                                  {getSeverityBadge(item.issue_severity)}
                                </div>
                              </div>

                              {/* Dates */}
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mb-2">
                                {item.requested_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Requested: {new Date(item.requested_date).toLocaleDateString()}
                                  </div>
                                )}
                                {item.received_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Received: {new Date(item.received_date).toLocaleDateString()}
                                  </div>
                                )}
                                {item.reviewed_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Reviewed: {new Date(item.reviewed_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>

                              {/* Assigned To */}
                              {item.assigned_to && (
                                <div className="flex items-center gap-1 text-xs text-slate-600 mb-2">
                                  <User className="h-3 w-3" />
                                  Assigned to: {item.assigned_to}
                                </div>
                              )}

                              {/* Issue Description */}
                              {item.issue_description && (
                                <div className="mb-2 p-2 bg-red-100 rounded text-sm text-red-800">
                                  <strong>Issue:</strong> {item.issue_description}
                                </div>
                              )}

                              {/* Notes */}
                              {item.notes && (
                                <div className="mb-2 text-sm text-slate-700">
                                  <strong>Notes:</strong> {item.notes}
                                </div>
                              )}

                              {/* Quick Actions */}
                              <div className="flex items-center gap-2 mt-2">
                                <select
                                  value={item.status}
                                  onChange={(e) => handleStatusChange(item.id, e.target.value as DDItem['status'])}
                                  className="text-xs border rounded px-2 py-1"
                                  disabled={saving}
                                >
                                  <option value="not_started">Not Started</option>
                                  <option value="requested">Requested</option>
                                  <option value="received">Received</option>
                                  <option value="reviewed">Reviewed</option>
                                  <option value="issue_found">Issue Found</option>
                                  <option value="cleared">Cleared</option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="Assigned to"
                                  defaultValue={item.assigned_to || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== item.assigned_to) {
                                      handleItemUpdate(item.id, { assigned_to: e.target.value || null });
                                    }
                                  }}
                                  className="text-xs border rounded px-2 py-1 flex-1 max-w-xs"
                                />
                                <textarea
                                  placeholder="Notes..."
                                  defaultValue={item.notes || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== item.notes) {
                                      handleItemUpdate(item.id, { notes: e.target.value || null });
                                    }
                                  }}
                                  className="text-xs border rounded px-2 py-1 flex-1 max-w-xs"
                                  rows={1}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
