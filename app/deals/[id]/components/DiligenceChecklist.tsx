'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
  notes?: string;
};

export function DiligenceChecklist({ 
  items, 
  dealId,
  emptyText 
}: { 
  items: string[]; 
  dealId: string;
  emptyText?: string;
}) {
  const [checklistState, setChecklistState] = useState<ChecklistItem[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize checklist from items
  useEffect(() => {
    if (items.length > 0) {
      const initialItems: ChecklistItem[] = items.map((item, idx) => ({
        id: `item-${idx}`,
        text: item,
        completed: false,
        notes: '',
      }));
      setChecklistState(initialItems);
    }
  }, [items]);

  // Load saved state
  useEffect(() => {
    if (!dealId || items.length === 0) return;

    const loadState = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;

        const res = await fetch(`/api/deals/${dealId}/diligence-checklist`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.checklist && typeof data.checklist === 'object') {
            // Convert API format to component format
            const savedItems: ChecklistItem[] = items.map((item, idx) => {
              const key = `item-${idx}`;
              const saved = data.checklist[key];
              return {
                id: key,
                text: item,
                completed: saved?.checked || false,
                notes: saved?.notes || '',
              };
            });
            setChecklistState(savedItems);
          }
        }
      } catch {
        // ignore
      }
    };

    loadState();
  }, [dealId, items.length]);

  // Save state
  const saveState = async (newState: ChecklistItem[]) => {
    if (!dealId) return;

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      // Convert component format to API format
      const checklist: Record<string, { checked: boolean; notes?: string }> = {};
      newState.forEach((item) => {
        checklist[item.id] = {
          checked: item.completed,
          notes: item.notes || undefined,
        };
      });

      await fetch(`/api/deals/${dealId}/diligence-checklist`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ checklist }),
      });
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = (id: string) => {
    const newState = checklistState.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklistState(newState);
    saveState(newState);
  };

  const updateNotes = (id: string, notes: string) => {
    const newState = checklistState.map(item =>
      item.id === id ? { ...item, notes } : item
    );
    setChecklistState(newState);
    
    // Debounce save: clear existing timer, set new one
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveState(newState);
    }, 500);
  };

  const toggleNotes = (id: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNotes(newExpanded);
  };

  const completedCount = checklistState.filter(item => item.completed).length;
  const totalCount = checklistState.length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-slate-600" />
          <h3 className="text-xl font-semibold text-slate-900">
            Due Diligence Checklist
          </h3>
        </div>
        {totalCount > 0 && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {completedCount}/{totalCount} completed
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-600">{emptyText || 'No checklist generated yet.'}</p>
      ) : (
        <ul className="space-y-3">
          {checklistState.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleComplete(item.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <span
                    className={`text-sm flex-1 ${
                      item.completed
                        ? 'text-slate-500 line-through'
                        : 'text-slate-700'
                    }`}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => toggleNotes(item.id)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    {expandedNotes.has(item.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {expandedNotes.has(item.id) && (
                  <textarea
                    value={item.notes || ''}
                    onChange={(e) => updateNotes(item.id, e.target.value)}
                    placeholder="Add notes..."
                    className="mt-2 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {saving && (
        <p className="mt-2 text-xs text-slate-500">Saving...</p>
      )}
    </div>
  );
}
