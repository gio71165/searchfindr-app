'use client';

import { useState, useEffect, useMemo } from 'react';
import { Filter, X, Plus, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/lib/auth-context';
import { showToast } from '@/components/ui/Toast';
import { dealMatchesCriteria, filterDealsByCriteria } from '@/lib/utils/criteria-matcher';
import type { SearchCriteria } from '@/lib/types/search-criteria';
import type { Deal } from '@/lib/types/deal';
import { SearchCriteriaModal } from './SearchCriteriaModal';

interface ApplyCriteriaFilterProps {
  deals: Deal[];
  onFilterChange: (filteredDeals: Deal[], criteria: SearchCriteria | null) => void;
}

export function ApplyCriteriaFilter({ deals, onFilterChange }: ApplyCriteriaFilterProps) {
  const { session, loading: authLoading } = useAuth();
  const [criteriaList, setCriteriaList] = useState<SearchCriteria[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<SearchCriteria | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<SearchCriteria | null>(null);

  useEffect(() => {
    if (authLoading || !session) return;
    loadCriteria();
  }, [authLoading, session]);

  useEffect(() => {
    if (selectedCriteria) {
      applyCriteria(selectedCriteria);
    } else {
      onFilterChange(deals, null);
    }
  }, [deals, selectedCriteria]);

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

  const applyCriteria = (criteria: SearchCriteria) => {
    const { matching } = filterDealsByCriteria(deals, criteria);
    onFilterChange(matching, criteria);
  };

  const handleSelectCriteria = (criteriaId: string | null) => {
    if (!criteriaId) {
      setSelectedCriteria(null);
      onFilterChange(deals, null);
      return;
    }

    const criteria = criteriaList.find(c => c.id === criteriaId);
    if (criteria) {
      setSelectedCriteria(criteria);
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
  };

  const matchingCount = useMemo(() => {
    if (!selectedCriteria) return deals.length;
    const { matching } = filterDealsByCriteria(deals, selectedCriteria);
    return matching.length;
  }, [deals, selectedCriteria]);

  const activeCriteria = criteriaList.filter(c => c.is_active);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-xs text-slate-500 font-medium">Search Criteria:</span>
        </div>
        
        {loading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            <select
              value={selectedCriteria?.id || ''}
              onChange={(e) => handleSelectCriteria(e.target.value || null)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Deals</option>
              {activeCriteria.map((criteria) => (
                <option key={criteria.id} value={criteria.id}>
                  {criteria.name}
                </option>
              ))}
            </select>

            {selectedCriteria && (
              <>
                <span className="text-xs text-slate-600">
                  {matchingCount} deal{matchingCount !== 1 ? 's' : ''} match{matchingCount !== 1 ? '' : 'es'}
                </span>
                <button
                  onClick={() => handleEdit(selectedCriteria)}
                  className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                  title="Edit criteria"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleSelectCriteria(null)}
                  className="touch-target p-2 text-slate-400 hover:text-slate-600"
                  title="Clear filter"
                  aria-label="Clear filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}

            <button
              onClick={handleCreateNew}
              data-onboarding="search-criteria"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 border-2 border-blue-700 rounded-lg hover:bg-blue-700 hover:border-blue-800 transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              New Criteria
            </button>
          </>
        )}
      </div>

      {selectedCriteria && matchingCount < deals.length && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Filtered:</strong> Showing {matchingCount} of {deals.length} deals matching "{selectedCriteria.name}".
              {selectedCriteria.description && (
                <div className="mt-1 text-blue-600">{selectedCriteria.description}</div>
              )}
            </div>
          </div>
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

/**
 * Component to show failed criteria on hover for non-matching deals
 */
export function CriteriaMatchTooltip({ 
  deal, 
  criteria 
}: { 
  deal: Deal; 
  criteria: SearchCriteria | null;
}) {
  if (!criteria) return null;

  const result = dealMatchesCriteria(deal, criteria);
  
  if (result.matches) return null;

  return (
    <div className="absolute z-10 hidden group-hover:block mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 shadow-lg max-w-xs">
      <div className="font-semibold mb-1">Does not match criteria:</div>
      <ul className="list-disc list-inside space-y-0.5">
        {result.failedCriteria.map((reason, idx) => (
          <li key={idx}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}
