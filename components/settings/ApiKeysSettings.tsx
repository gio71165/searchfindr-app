'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { showToast } from '@/components/ui/Toast';
import { LoadingDots } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { Key, Plus, Trash2, Copy, Check, Edit2, X, AlertTriangle } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export function ApiKeysSettings() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingKeyName, setEditingKeyName] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      loadKeys();
    }
  }, [user]);

  async function loadKeys() {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/user/api-keys', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load API keys');
      }

      const { keys: apiKeys } = await response.json();
      setKeys(apiKeys || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      showToast('Failed to load API keys', 'error', 3000);
    } finally {
      setLoading(false);
    }
  }

  async function generateKey() {
    if (!user || !newKeyName.trim()) {
      showToast('Please enter a key name', 'error', 2000);
      return;
    }

    if (keys.filter(k => !k.revoked_at).length >= 5) {
      showToast('Maximum of 5 API keys allowed. Please revoke an existing key first.', 'error', 4000);
      return;
    }

    setGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Please log in to generate API keys', 'error', 3000);
        return;
      }

      const response = await fetch('/api/user/api-keys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to generate API key');
      }

      const { apiKey, keyData } = await response.json();
      setNewKey(apiKey);
      setShowNewKeyModal(false); // Close name input modal
      setNewKeyName('');
      await loadKeys();
    } catch (error: any) {
      console.error('Error generating API key:', error);
      showToast(error.message || 'Failed to generate API key', 'error', 5000, {
        label: 'Retry',
        onClick: generateKey
      });
    } finally {
      setGenerating(false);
    }
  }

  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);

  function openRevokeModal(key: ApiKey) {
    setKeyToRevoke(key);
    setShowRevokeModal(true);
  }

  async function revokeKey() {
    if (!keyToRevoke) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setRevokingKeyId(keyToRevoke.id);

      const response = await fetch(`/api/user/api-keys/${keyToRevoke.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to revoke API key');
      }

      showToast('API key revoked successfully', 'success', 2000);
      setShowRevokeModal(false);
      setKeyToRevoke(null);
      await loadKeys();
    } catch (error) {
      console.error('Error revoking API key:', error);
      showToast('Failed to revoke API key', 'error', 3000);
    } finally {
      setRevokingKeyId(null);
    }
  }

  async function updateKeyName(keyId: string) {
    if (!editingKeyName.trim()) {
      showToast('Key name cannot be empty', 'error', 2000);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: editingKeyName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update API key name');
      }

      showToast('Key name updated', 'success', 2000);
      setEditingKeyId(null);
      await loadKeys();
    } catch (error) {
      console.error('Error updating key name:', error);
      showToast('Failed to update key name', 'error', 3000);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('Copied!', 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        showToast('Copied!', 'success', 2000);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        showToast('Failed to copy', 'error', 2000);
      }
      document.body.removeChild(textArea);
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return null;
    return new Date(dateString);
  }

  function formatRelativeTime(date: Date | null): string {
    if (!date) return 'Never used';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatCreatedDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const activeKeys = keys.filter(k => !k.revoked_at);
  const revokedKeys = keys.filter(k => k.revoked_at);

  return (
    <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <span className="text-xl">🔌</span>
            Chrome Extension API Keys
          </h2>
          <p className="text-sm text-slate-600">
            Generate API keys to connect the SearchFindr Chrome extension. Each key can be revoked at any time.
          </p>
        </div>
        <button
          onClick={() => {
            setNewKeyName('');
            setShowNewKeyModal(true);
            setNewKey(null);
          }}
          disabled={activeKeys.length >= 5 || generating}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Generate New API Key
        </button>
      </div>

      {activeKeys.length >= 5 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            You have reached the maximum of 5 API keys. Please revoke an existing key before creating a new one.
          </p>
        </div>
      )}

      {/* Generate Key Name Modal */}
      {showNewKeyModal && !newKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Generate New API Key</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Key Name
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Chrome Extension - Work Laptop"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newKeyName.trim() && !generating) {
                    generateKey();
                  }
                }}
              />
              <p className="mt-1 text-xs text-slate-500">
                Choose a name to help you remember where this key is used
              </p>
            </div>
            <div className="flex gap-2">
              <AsyncButton
                onClick={generateKey}
                isLoading={generating}
                loadingText="Generating..."
                disabled={!newKeyName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                Generate Key
              </AsyncButton>
              <button
                onClick={() => {
                  setShowNewKeyModal(false);
                  setNewKeyName('');
                }}
                disabled={generating}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show New Key Modal */}
      {newKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">API Key Generated</h3>
            <p className="text-sm text-amber-600 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Save this key now. You won't be able to see it again.
            </p>
            <div className="mb-4 p-3 bg-slate-100 rounded-lg border border-slate-300">
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono text-slate-900 break-all">{newKey}</code>
                <button
                  onClick={() => copyToClipboard(newKey)}
                  className="flex-shrink-0 p-2 hover:bg-slate-200 rounded"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-slate-600" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(newKey)}
              className="w-full mb-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy to Clipboard
            </button>
            <button
              onClick={() => {
                setNewKey(null);
                setShowNewKeyModal(false);
              }}
              className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              I've Saved My Key
            </button>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {showRevokeModal && keyToRevoke && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Revoke API Key?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to revoke this API key?
            </p>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-sm font-medium text-slate-900 mb-1">{keyToRevoke.name}</div>
              <div className="text-xs text-slate-600 font-mono">{keyToRevoke.key_prefix}...</div>
            </div>
            <p className="text-sm text-amber-600 mb-4 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              The Chrome extension using this key will stop working immediately.
            </p>
            <div className="flex gap-2">
              <button
                onClick={revokeKey}
                disabled={revokingKeyId === keyToRevoke.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {revokingKeyId === keyToRevoke.id ? 'Revoking...' : 'Revoke Key'}
              </button>
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setKeyToRevoke(null);
                }}
                disabled={revokingKeyId === keyToRevoke.id}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Keys */}
      {loading ? (
        <p className="text-sm text-slate-600">Loading API keys...</p>
      ) : activeKeys.length === 0 && revokedKeys.length === 0 ? (
        <div className="text-center py-8">
          <Key className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-2">No API keys yet</p>
          <p className="text-xs text-slate-500">Generate your first API key to use the Chrome extension</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeKeys.map((key) => (
            <div
              key={key.id}
              className="p-4 bg-white rounded-lg border border-slate-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {editingKeyId === key.id ? (
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={editingKeyName}
                        onChange={(e) => setEditingKeyName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateKeyName(key.id);
                          if (e.key === 'Escape') {
                            setEditingKeyId(null);
                            setEditingKeyName('');
                          }
                        }}
                      />
                      <button
                        onClick={() => updateKeyName(key.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingKeyId(null);
                          setEditingKeyName('');
                        }}
                        className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-slate-900">{key.name}</h3>
                      <button
                        onClick={() => {
                          setEditingKeyId(key.id);
                          setEditingKeyName(key.name);
                        }}
                        className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                        title="Edit name"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                        {key.key_prefix}•••
                      </code>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                        Active
                      </span>
                    </div>
                    <div>Created: {formatCreatedDate(key.created_at)}</div>
                    <div>Last used: {formatRelativeTime(formatDate(key.last_used_at))}</div>
                    {key.expires_at && (
                      <div>Expires: {formatCreatedDate(key.expires_at)}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openRevokeModal(key)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Revoke key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Revoked Keys</h3>
          <div className="space-y-2">
            {revokedKeys.map((key) => (
              <div
                key={key.id}
                className="p-3 bg-slate-100 rounded-lg border border-slate-200 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-700">{key.name}</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                        Revoked
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {key.key_prefix}••• • Revoked {key.revoked_at ? formatCreatedDate(key.revoked_at) : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          <strong>Security Warning:</strong> Keep your API keys secure. Never share them publicly or commit them to version control. 
          If a key is compromised, revoke it immediately and generate a new one.
        </p>
      </div>
    </div>
  );
}
