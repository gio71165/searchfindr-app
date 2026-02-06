'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { LoadingDots } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import type { SearchCriteria, CreateSearchCriteriaData } from '@/lib/types/search-criteria';
import { JargonTooltip } from '@/components/ui/JargonTooltip';
import { IconButton } from '@/components/ui/IconButton';

interface SearchCriteriaModalProps {
  criteria: SearchCriteria | null;
  onClose: () => void;
  onSuccess: () => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function SearchCriteriaModal({ criteria, onClose, onSuccess }: SearchCriteriaModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateSearchCriteriaData>({
    name: '',
    description: null,
    is_active: true,
    states: null,
    exclude_states: null,
    max_distance_from_home: null,
    revenue_min: null,
    revenue_max: null,
    ebitda_min: null,
    ebitda_max: null,
    margin_min: null,
    asking_price_max: null,
    multiple_max: null,
    sba_eligible_only: false,
    industries: null,
    exclude_industries: null,
    b2b_only: false,
    recurring_revenue_min: null,
    customer_concentration_max: null,
    owner_willing_to_stay: null,
    max_owner_dependence: null,
  });

  useEffect(() => {
    if (criteria) {
      setFormData({
        name: criteria.name,
        description: criteria.description,
        is_active: criteria.is_active,
        states: criteria.states,
        exclude_states: criteria.exclude_states,
        max_distance_from_home: criteria.max_distance_from_home,
        revenue_min: criteria.revenue_min,
        revenue_max: criteria.revenue_max,
        ebitda_min: criteria.ebitda_min,
        ebitda_max: criteria.ebitda_max,
        margin_min: criteria.margin_min,
        asking_price_max: criteria.asking_price_max,
        multiple_max: criteria.multiple_max,
        sba_eligible_only: criteria.sba_eligible_only,
        industries: criteria.industries,
        exclude_industries: criteria.exclude_industries,
        b2b_only: criteria.b2b_only,
        recurring_revenue_min: criteria.recurring_revenue_min,
        customer_concentration_max: criteria.customer_concentration_max,
        owner_willing_to_stay: criteria.owner_willing_to_stay,
        max_owner_dependence: criteria.max_owner_dependence,
      });
    }
  }, [criteria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const url = criteria ? `/api/search-criteria/${criteria.id}` : '/api/search-criteria';
      const method = criteria ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to save criteria' }));
        throw new Error(errorData.error || 'Failed to save criteria');
      }

      showToast(criteria ? 'Criteria updated' : 'Criteria created', 'success');
      
      // Emit event for onboarding
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('search-criteria-saved'));
        localStorage.setItem('search_criteria_saved', 'true');
      }
      
      // Track search criteria set
      window.dispatchEvent(new CustomEvent('onboarding:search-criteria-set'));
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save criteria';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!criteria || !window.confirm('Are you sure you want to delete this search criteria?')) {
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch(`/api/search-criteria/${criteria.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete criteria');
      }

      showToast('Criteria deleted', 'success');
      onSuccess();
    } catch (error) {
      showToast('Failed to delete criteria', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleArrayChange = (field: 'states' | 'exclude_states' | 'industries' | 'exclude_industries', value: string) => {
    const current = formData[field] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFormData({ ...formData, [field]: updated.length > 0 ? updated : null });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {criteria ? 'Edit Search Criteria' : 'Create Search Criteria'}
          </h2>
          <IconButton
            onClick={onClose}
            icon={<X className="h-5 w-5" />}
            label="Close modal"
            className="text-slate-400 hover:text-slate-600"
          />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm font-medium text-slate-700">Active</label>
            </div>
          </div>

          {/* Geography */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Geography</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Target States</label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {US_STATES.map(state => (
                    <label key={state} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(formData.states || []).includes(state)}
                        onChange={() => handleArrayChange('states', state)}
                        className="rounded"
                      />
                      {state}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Exclude States</label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {US_STATES.map(state => (
                    <label key={state} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(formData.exclude_states || []).includes(state)}
                        onChange={() => handleArrayChange('exclude_states', state)}
                        className="rounded"
                      />
                      {state}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Distance from Home (miles)</label>
              <input
                type="number"
                value={formData.max_distance_from_home || ''}
                onChange={(e) => setFormData({ ...formData, max_distance_from_home: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Financials */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Financials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Revenue Min ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.revenue_min || ''}
                  onChange={(e) => setFormData({ ...formData, revenue_min: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Revenue Max ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.revenue_max || ''}
                  onChange={(e) => setFormData({ ...formData, revenue_max: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <JargonTooltip term="EBITDA">EBITDA</JargonTooltip> Min ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.ebitda_min || ''}
                  onChange={(e) => setFormData({ ...formData, ebitda_min: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <JargonTooltip term="EBITDA">EBITDA</JargonTooltip> Max ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.ebitda_max || ''}
                  onChange={(e) => setFormData({ ...formData, ebitda_max: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <JargonTooltip term="EBITDA">EBITDA</JargonTooltip> Margin Min (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.margin_min || ''}
                  onChange={(e) => setFormData({ ...formData, margin_min: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Deal Terms */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Deal Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Asking Price Max ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.asking_price_max || ''}
                  onChange={(e) => setFormData({ ...formData, asking_price_max: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Multiple Max (x)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.multiple_max || ''}
                  onChange={(e) => setFormData({ ...formData, multiple_max: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.sba_eligible_only}
                  onChange={(e) => setFormData({ ...formData, sba_eligible_only: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm font-medium text-slate-700">
                  <JargonTooltip term="SBA">SBA</JargonTooltip> Eligible Only
                </label>
              </div>
            </div>
          </div>

          {/* Business */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Business</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Target Industries</label>
              <input
                type="text"
                placeholder="Comma-separated: healthcare, manufacturing, services"
                value={(formData.industries || []).join(', ')}
                onChange={(e) => {
                  const industries = e.target.value
                    .split(',')
                    .map(i => i.trim())
                    .filter(i => i.length > 0);
                  setFormData({ ...formData, industries: industries.length > 0 ? industries : null });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Exclude Industries</label>
              <input
                type="text"
                placeholder="Comma-separated: retail, restaurants"
                value={(formData.exclude_industries || []).join(', ')}
                onChange={(e) => {
                  const industries = e.target.value
                    .split(',')
                    .map(i => i.trim())
                    .filter(i => i.length > 0);
                  setFormData({ ...formData, exclude_industries: industries.length > 0 ? industries : null });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.b2b_only}
                  onChange={(e) => setFormData({ ...formData, b2b_only: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm font-medium text-slate-700">B2B Only</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recurring Revenue Min (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.recurring_revenue_min || ''}
                  onChange={(e) => setFormData({ ...formData, recurring_revenue_min: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Concentration Max (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.customer_concentration_max || ''}
                  onChange={(e) => setFormData({ ...formData, customer_concentration_max: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Owner */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Owner</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Owner Willing to Stay</label>
                <select
                  value={formData.owner_willing_to_stay === null ? '' : formData.owner_willing_to_stay ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, owner_willing_to_stay: e.target.value === '' ? null : e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No preference</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Owner Dependence</label>
                <select
                  value={formData.max_owner_dependence || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ 
                      ...formData, 
                      max_owner_dependence: value === '' 
                        ? null 
                        : (value === 'low' || value === 'medium' || value === 'high' 
                            ? value as 'low' | 'medium' | 'high' 
                            : null)
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No preference</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <AsyncButton
              type="submit"
              isLoading={loading}
              loadingText="Saving..."
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              {criteria ? 'Update Criteria' : 'Create Criteria'}
            </AsyncButton>
            {criteria && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
