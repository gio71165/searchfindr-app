'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { showToast } from '@/components/ui/Toast';
import { SearchCriteriaModal } from '@/components/dashboard/SearchCriteriaModal';
import type { SearchCriteria } from '@/lib/types/search-criteria';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function SearchCriteriaSettings() {
  const { session, loading: authLoading } = useAuth();
  const [criteriaList, setCriteriaList] = useState<SearchCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<SearchCriteria | null>(null);

  useEffect(() => {
    if (authLoading || !session) return;
    loadCriteria();
  }, [authLoading, session]);

  const loadCriteria = async () => {
    if (!session?.access_token) return;
    
    setLoading(true);
    try {
      const token = session.access_token;

      const res = await fetch('/api/search-criteria', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCriteriaList(data.criteria || []);
      } else if (res.status === 401) {
        // Auth not ready yet, will retry when session is available
        return;
      }
    } catch (error) {
      // Silently fail during initial load - auth might not be ready
      if (authLoading) return;
      console.error('Error loading search criteria:', error);
    } finally {
      if (!authLoading) {
        setLoading(false);
      }
    }
  };

  const handleCreateNew = () => {
    setEditingCriteria(null);
    setShowModal(true);
  };

  const handleEdit = (criteria: SearchCriteria) => {
    setEditingCriteria(criteria);
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    loadCriteria();
    setShowModal(false);
    setEditingCriteria(null);
    
    // Emit event for onboarding
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('search-criteria-saved'));
      localStorage.setItem('search_criteria_saved', 'true');
    }
  };

  return (
    <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-600">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-50 mb-1">Search Criteria</h2>
          <p className="text-sm text-slate-400">
            Define what deals you're looking for. Set industries, geography, deal size, revenue, and EBITDA ranges.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Criteria
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      ) : criteriaList.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400 mb-4">
            No search criteria defined yet. Create your first criteria to get started.
          </p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-300 bg-blue-500/20 border border-blue-500/50 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Search Criteria
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {criteriaList.map((criteria) => (
            <div
              key={criteria.id}
              className="p-4 bg-slate-900/50 border border-slate-600 rounded-lg hover:border-slate-500 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-50">{criteria.name}</h3>
                    {criteria.is_active && (
                      <span className="px-2 py-0.5 text-xs font-medium text-emerald-300 bg-emerald-500/20 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  {criteria.description && (
                    <p className="text-sm text-slate-400 mb-2">{criteria.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    {criteria.industries && criteria.industries.length > 0 && (
                      <span>Industries: {criteria.industries.join(', ')}</span>
                    )}
                    {criteria.states && criteria.states.length > 0 && (
                      <span>States: {criteria.states.join(', ')}</span>
                    )}
                    {(criteria.revenue_min || criteria.revenue_max) && (
                      <span>
                        Revenue: ${criteria.revenue_min?.toLocaleString() || '0'} - ${criteria.revenue_max?.toLocaleString() || '∞'}
                      </span>
                    )}
                    {(criteria.ebitda_min || criteria.ebitda_max) && (
                      <span>
                        EBITDA: ${criteria.ebitda_min?.toLocaleString() || '0'} - ${criteria.ebitda_max?.toLocaleString() || '∞'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(criteria)}
                  className="ml-4 px-3 py-1.5 text-sm text-blue-300 hover:text-blue-200 hover:bg-blue-500/20 rounded-lg transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SearchCriteriaModal
          criteria={editingCriteria}
          onClose={() => {
            setShowModal(false);
            setEditingCriteria(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
