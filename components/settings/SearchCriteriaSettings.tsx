'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import { SearchCriteriaModal } from '@/components/dashboard/SearchCriteriaModal';
import type { SearchCriteria } from '@/lib/types/search-criteria';

export function SearchCriteriaSettings() {
  const [criteriaList, setCriteriaList] = useState<SearchCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<SearchCriteria | null>(null);

  useEffect(() => {
    loadCriteria();
  }, []);

  const loadCriteria = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) return;

      const res = await fetch('/api/search-criteria', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCriteriaList(data.criteria || []);
      }
    } catch (error) {
      console.error('Error loading search criteria:', error);
    } finally {
      setLoading(false);
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
    <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-900 mb-1">Search Criteria</h2>
          <p className="text-sm text-slate-600">
            Define what deals you're looking for. Set industries, geography, deal size, revenue, and EBITDA ranges.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Criteria
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : criteriaList.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-600 mb-4">
            No search criteria defined yet. Create your first criteria to get started.
          </p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
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
              className="p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{criteria.name}</h3>
                    {criteria.is_active && (
                      <span className="px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  {criteria.description && (
                    <p className="text-sm text-slate-600 mb-2">{criteria.description}</p>
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
                  className="ml-4 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
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
