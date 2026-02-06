'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { showToast } from '@/components/ui/Toast';

interface SavedFilter {
  id: string;
  name: string;
  filters: {
    source?: string | null;
    stage?: string;
    verdict?: string;
    search?: string;
  };
}

interface SavedFiltersProps {
  onLoadFilter: (filters: SavedFilter['filters']) => void;
  currentFilters: {
    source?: string | null;
    stage?: string;
    verdict?: string;
    search?: string;
  };
}

export function SavedFilters({ onLoadFilter, currentFilters }: SavedFiltersProps) {
  const { session, loading: authLoading } = useAuth();
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    if (authLoading || !session) return;
    loadSavedFilters();
  }, [authLoading, session]);

  const loadSavedFilters = async () => {
    if (!session?.access_token) return;
    
    try {
      const token = session.access_token;

      const response = await fetch('/api/filter-presets', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedFilters(data.presets || []);
      } else if (response.status === 401) {
        // Auth not ready yet, will retry when session is available
        return;
      }
    } catch (error) {
      // Silently fail during initial load - auth might not be ready
      if (authLoading) return;
      console.error('Error loading saved filters:', error);
    } finally {
      if (!authLoading) {
        setLoading(false);
      }
    }
  };

  const handleSaveCurrent = async () => {
    if (!filterName.trim()) {
      showToast('Please enter a name for this filter', 'error');
      return;
    }

    if (!session?.access_token) {
      showToast('Please log in to save filters', 'error');
      return;
    }

    try {
      const token = session.access_token;

      const response = await fetch('/api/filter-presets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: filterName.trim(),
          filters: currentFilters,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save filter');
      }

      showToast('Filter saved successfully', 'success');
      setShowSaveModal(false);
      setFilterName('');
      loadSavedFilters();
    } catch (error) {
      console.error('Error saving filter:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save filter', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this saved filter?')) return;

    if (!session?.access_token) return;

    try {
      const token = session.access_token;

      const response = await fetch(`/api/filter-presets/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete filter');
      }

      showToast('Filter deleted', 'success');
      loadSavedFilters();
    } catch (error) {
      console.error('Error deleting filter:', error);
      showToast('Failed to delete filter', 'error');
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        {savedFilters.length > 0 && (
          <>
            <span className="text-xs text-slate-500 font-medium">Smart Lists:</span>
            {savedFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onLoadFilter(filter.filters)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <BookmarkCheck className="h-3 w-3" />
                {filter.name}
              </button>
            ))}
          </>
        )}
        <button
          onClick={() => setShowSaveModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Save as Smart List
        </button>
      </div>

      {showSaveModal && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowSaveModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Save Smart List</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveCurrent();
                } else if (e.key === 'Escape') {
                  setShowSaveModal(false);
                }
              }}
              placeholder="e.g. Hot Deals - West Coast Manufacturing"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveCurrent}
                className="btn-secondary flex-1"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
