'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, X, Edit2, Trash2, Star } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import { AsyncButton } from '@/components/ui/AsyncButton';

interface Broker {
  id: string;
  name: string;
  firm: string | null;
  email: string | null;
  phone: string | null;
  quality_rating: 'excellent' | 'good' | 'average' | 'poor' | null;
  notes: string | null;
  deal_count?: number;
}

interface BrokerSelectorProps {
  dealId: string;
  currentBrokerId: string | null | undefined;
  onUpdate?: () => void;
}

const QUALITY_COLORS = {
  excellent: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  good: 'text-blue-600 bg-blue-50 border-blue-200',
  average: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  poor: 'text-red-600 bg-red-50 border-red-200',
};

export function BrokerSelector({ dealId, currentBrokerId, onUpdate }: BrokerSelectorProps) {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    firm: '',
    email: '',
    phone: '',
    quality_rating: '' as '' | 'excellent' | 'good' | 'average' | 'poor',
    notes: '',
  });

  useEffect(() => {
    loadBrokers();
  }, []);

  const loadBrokers = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const response = await fetch('/api/brokers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBrokers(data.brokers || []);
      }
    } catch (error) {
      console.error('Error loading brokers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBroker = async (brokerId: string | null) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        showToast('Please log in', 'error');
        return;
      }

      const response = await fetch(`/api/deals/${dealId}/broker`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ broker_id: brokerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update broker');
      }

      showToast('Broker updated', 'success');
      onUpdate?.();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating broker:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update broker', 'error');
    }
  };

  const handleSaveBroker = async () => {
    if (!formData.name.trim()) {
      showToast('Broker name is required', 'error');
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        showToast('Please log in', 'error');
        return;
      }

      const url = editingBroker ? `/api/brokers/${editingBroker.id}` : '/api/brokers';
      const method = editingBroker ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          firm: formData.firm.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          quality_rating: formData.quality_rating || null,
          notes: formData.notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save broker');
      }

      showToast(editingBroker ? 'Broker updated' : 'Broker created', 'success');
      setShowModal(false);
      resetForm();
      loadBrokers();
    } catch (error) {
      console.error('Error saving broker:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save broker', 'error');
    }
  };

  const handleDeleteBroker = async (brokerId: string) => {
    if (!window.confirm('Are you sure you want to delete this broker? This will remove the broker association from all deals.')) {
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/brokers/${brokerId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete broker');
      }

      showToast('Broker deleted', 'success');
      loadBrokers();
      if (currentBrokerId === brokerId) {
        handleSelectBroker(null);
      }
    } catch (error) {
      console.error('Error deleting broker:', error);
      showToast('Failed to delete broker', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      firm: '',
      email: '',
      phone: '',
      quality_rating: '',
      notes: '',
    });
    setEditingBroker(null);
  };

  const startEdit = (broker: Broker) => {
    setEditingBroker(broker);
    setFormData({
      name: broker.name,
      firm: broker.firm || '',
      email: broker.email || '',
      phone: broker.phone || '',
      quality_rating: broker.quality_rating || '',
      notes: broker.notes || '',
    });
    setShowModal(true);
  };

  const currentBroker = brokers.find(b => b.id === currentBrokerId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Broker</span>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="h-3 w-3 inline mr-1" />
          Add Broker
        </button>
      </div>

      {currentBroker ? (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-900">{currentBroker.name}</span>
                {currentBroker.quality_rating && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${QUALITY_COLORS[currentBroker.quality_rating]}`}>
                    {currentBroker.quality_rating}
                  </span>
                )}
              </div>
              {currentBroker.firm && (
                <div className="text-xs text-slate-600">{currentBroker.firm}</div>
              )}
              {currentBroker.email && (
                <div className="text-xs text-slate-600">{currentBroker.email}</div>
              )}
              {currentBroker.deal_count !== undefined && (
                <div className="text-xs text-slate-500 mt-1">
                  {currentBroker.deal_count} deal{currentBroker.deal_count !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => startEdit(currentBroker)}
                className="touch-target p-2 text-slate-400 hover:text-blue-600 transition-colors"
                title="Edit broker"
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleSelectBroker(null)}
                className="touch-target p-2 text-slate-400 hover:text-red-600 transition-colors"
                title="Remove broker"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <select
          onChange={(e) => handleSelectBroker(e.target.value || null)}
          value=""
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a broker...</option>
          {brokers.map((broker) => (
            <option key={broker.id} value={broker.id}>
              {broker.name}{broker.firm ? ` - ${broker.firm}` : ''}
            </option>
          ))}
        </select>
      )}

      {/* Broker Management Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-lg shadow-lg p-6 z-50 min-w-[400px] max-w-[500px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingBroker ? 'Edit Broker' : 'Add Broker'}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Firm</label>
                <input
                  type="text"
                  value={formData.firm}
                  onChange={(e) => setFormData({ ...formData, firm: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ABC Business Brokers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quality Rating</label>
                <select
                  value={formData.quality_rating}
                  onChange={(e) => setFormData({ ...formData, quality_rating: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not rated</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Additional notes about this broker..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <AsyncButton
                onClick={handleSaveBroker}
                isLoading={saving}
                loadingText={editingBroker ? 'Updating...' : 'Creating...'}
                className="btn-secondary flex-1"
              >
                {editingBroker ? 'Update' : 'Create'}
              </AsyncButton>
              {editingBroker && (
                <button
                  onClick={() => handleDeleteBroker(editingBroker.id)}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4 inline mr-1" />
                  Delete
                </button>
              )}
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
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
