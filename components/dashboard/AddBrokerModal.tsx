'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';

export function AddBrokerModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [firm, setFirm] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Broker name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        showToast('Please sign in to add a broker', 'error');
        return;
      }
      const res = await fetch('/api/brokers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          firm: firm.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create broker');
      }
      showToast('Broker added', 'success');
      onSuccess();
    } catch (err) {
      console.error('Add broker error:', err);
      showToast(err instanceof Error ? err.message : 'Failed to add broker', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 w-full max-w-md overflow-hidden"
        role="dialog"
        aria-labelledby="add-broker-title"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 id="add-broker-title" className="text-xl font-semibold text-slate-50">
            Add New Broker
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="broker-name" className="block text-sm font-medium text-slate-400 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="broker-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Broker name"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="broker-firm" className="block text-sm font-medium text-slate-400 mb-1">
              Firm
            </label>
            <input
              id="broker-firm"
              type="text"
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
              placeholder="Company or firm"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="broker-email" className="block text-sm font-medium text-slate-400 mb-1">
              Email
            </label>
            <input
              id="broker-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="broker-phone" className="block text-sm font-medium text-slate-400 mb-1">
              Phone
            </label>
            <input
              id="broker-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="broker-notes" className="block text-sm font-medium text-slate-400 mb-1">
              Notes
            </label>
            <textarea
              id="broker-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Adding…' : 'Add Broker'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
