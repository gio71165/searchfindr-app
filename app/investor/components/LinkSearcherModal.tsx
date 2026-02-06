'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';

interface LinkSearcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LinkSearcherModal({ isOpen, onClose, onSuccess }: LinkSearcherModalProps) {
  const [workspaceId, setWorkspaceId] = useState('');
  const [capitalCommitted, setCapitalCommitted] = useState('');
  const [accessLevel, setAccessLevel] = useState<'full' | 'summary'>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/investor/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workspaceId,
          capitalCommitted: capitalCommitted || null,
          accessLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to link searcher');
      }

      // Reset form
      setWorkspaceId('');
      setCapitalCommitted('');
      setAccessLevel('summary');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link searcher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-slate-50">Link Searcher</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 transition-colors p-2 hover:bg-slate-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Searcher Workspace ID *
            </label>
            <input
              type="text"
              required
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-sm placeholder-slate-500"
              placeholder="00000000-0000-0000-0000-000000000000"
            />
            <p className="mt-1 text-xs text-slate-500">
              The searcher's workspace ID. They can find this in their Settings page under Profile Information.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Capital Committed (optional)
            </label>
            <input
              type="number"
              value={capitalCommitted}
              onChange={(e) => setCapitalCommitted(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-500"
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Access Level
            </label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as 'full' | 'summary')}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="summary">Summary (aggregated metrics only)</option>
              <option value="full">Full (all deal details including company names)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Linking...' : 'Link Searcher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
