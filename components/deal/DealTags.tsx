'use client';

import React, { useState, useEffect } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';

interface DealTagsProps {
  dealId: string;
  tags: string[] | null | undefined;
  onUpdate?: () => void;
}

const COMMON_TAGS = [
  'SBA Eligible',
  'Platform',
  'Add-on',
  'Talked to broker',
  'Waiting on financials',
  'High priority',
  'Follow up',
  'Under review',
];

export function DealTags({ dealId, tags: initialTags, onUpdate }: DealTagsProps) {
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setTags(initialTags || []);
  }, [initialTags]);

  const availableTags = COMMON_TAGS.filter(tag => !tags.includes(tag));

  const handleAddTag = async (tagToAdd: string) => {
    if (!tagToAdd.trim() || tags.includes(tagToAdd.trim())) return;

    const newTags = [...tags, tagToAdd.trim()];
    setTags(newTags);
    setNewTag('');
    setShowSuggestions(false);

    await saveTags(newTags);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    await saveTags(newTags);
  };

  const saveTags = async (tagsToSave: string[]) => {
    setIsSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        showToast('Please log in to update tags', 'error');
        return;
      }

      const response = await fetch(`/api/deals/${dealId}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags: tagsToSave }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save tags');
      }

      onUpdate?.();
    } catch (error) {
      console.error('Error saving tags:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save tags', 'error');
      // Revert on error
      setTags(initialTags || []);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Tags</span>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Edit
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium"
            >
              {tag}
              {isEditing && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  disabled={isSaving}
                  className="touch-target hover:bg-blue-100 rounded-full p-2 transition-colors disabled:opacity-50"
                  aria-label="Remove tag"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => {
                setNewTag(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTag.trim()) {
                  e.preventDefault();
                  handleAddTag(newTag);
                } else if (e.key === 'Escape') {
                  setIsEditing(false);
                  setNewTag('');
                  setShowSuggestions(false);
                }
              }}
              placeholder="Add a tag..."
              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSaving}
            />
            <button
              onClick={() => {
                setIsEditing(false);
                setNewTag('');
                setShowSuggestions(false);
              }}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Done
            </button>
          </div>

          {showSuggestions && availableTags.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 max-h-32 overflow-y-auto">
              {availableTags
                .filter(tag => tag.toLowerCase().includes(newTag.toLowerCase()))
                .slice(0, 5)
                .map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    className="w-full text-left px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 rounded transition-colors"
                  >
                    {tag}
                  </button>
                ))}
            </div>
          )}

          {availableTags.length > 0 && !showSuggestions && (
            <div className="text-xs text-slate-500">
              Suggestions:{' '}
              {availableTags.slice(0, 3).map((tag, idx) => (
                <button
                  key={tag}
                  onClick={() => handleAddTag(tag)}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  {tag}
                  {idx < 2 && ', '}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tags.length === 0 && !isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add tags
        </button>
      )}
    </div>
  );
}
