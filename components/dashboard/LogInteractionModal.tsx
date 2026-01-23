'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import { LoadingDots } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { IconButton } from '@/components/ui/IconButton';

interface Broker {
  id: string;
  name: string;
}

export function LogInteractionModal({
  broker,
  onClose,
  onSuccess,
}: {
  broker: Broker;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    interaction_type: 'email' as 'email' | 'phone' | 'meeting' | 'deal_received' | 'feedback' | 'other',
    interaction_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.interaction_type) {
      showToast('Please select an interaction type', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const interactionDate = formData.interaction_date
        ? new Date(formData.interaction_date).toISOString()
        : new Date().toISOString();

      const res = await fetch(`/api/brokers/${broker.id}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          interaction_type: formData.interaction_type,
          interaction_date: interactionDate,
          notes: formData.notes || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to log interaction' }));
        throw new Error(errorData.error || 'Failed to log interaction');
      }

      showToast('Interaction logged successfully', 'success');
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to log interaction';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Log Interaction</h2>
            <IconButton
              onClick={onClose}
              icon={<X className="h-5 w-5" />}
              label="Close modal"
              className="text-slate-400 hover:text-slate-600"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Broker
              </label>
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                {broker.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Interaction Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.interaction_type}
                onChange={(e) => setFormData({ ...formData, interaction_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="meeting">Meeting</option>
                <option value="deal_received">Deal Received</option>
                <option value="feedback">Feedback</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.interaction_date}
                onChange={(e) => setFormData({ ...formData, interaction_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add any notes about this interaction..."
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <AsyncButton
                type="submit"
                isLoading={loading}
                loadingText="Logging..."
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                Log Interaction
              </AsyncButton>
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
      </div>
    </>
  );
}
