'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ShortcutContext } from '@/lib/hooks/useKeyboardShortcuts';

interface Shortcut {
  key: string;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  context: ShortcutContext[];
}

const SHORTCUTS: Shortcut[] = [
  // Global shortcuts
  {
    key: '/',
    description: 'Focus search bar',
    context: ['global'],
  },
  {
    key: '?',
    description: 'Show keyboard shortcuts',
    context: ['global'],
  },
  {
    key: 'Escape',
    description: 'Close modals/overlays',
    context: ['global'],
  },
  // Deal detail shortcuts
  {
    key: 'P',
    description: 'Mark as Proceed',
    context: ['deal-detail'],
  },
  {
    key: 'K',
    description: 'Mark as Park',
    context: ['deal-detail'],
  },
  {
    key: 'X',
    description: 'Open Pass modal',
    context: ['deal-detail'],
  },
  {
    key: 'E',
    description: 'Edit deal details',
    context: ['deal-detail'],
  },
  {
    key: 'N',
    description: 'Add quick note',
    context: ['deal-detail'],
  },
  // Dashboard shortcuts
  {
    key: 'J',
    description: 'Next deal in list',
    context: ['dashboard'],
  },
  {
    key: 'K',
    description: 'Previous deal in list',
    context: ['dashboard'],
  },
  {
    key: 'Enter',
    description: 'Open selected deal',
    context: ['dashboard'],
  },
  {
    key: 'N',
    shift: true,
    description: 'Upload new CIM',
    context: ['dashboard'],
  },
  {
    key: 'N',
    description: 'New deal (upload CIM)',
    context: ['dashboard'],
  },
  {
    key: 'P',
    description: 'Pass current deal',
    context: ['dashboard'],
  },
  {
    key: 'P',
    shift: true,
    description: 'Bulk proceed selected deals',
    context: ['dashboard'],
  },
];

function formatKey(key: string, shift?: boolean, ctrl?: boolean, alt?: boolean, meta?: boolean): string {
  const parts: string[] = [];
  if (meta) parts.push('⌘');
  if (ctrl) parts.push('Ctrl');
  if (alt) parts.push('Alt');
  if (shift) parts.push('Shift');
  
  // Format the main key
  if (key === 'Escape') {
    parts.push('Esc');
  } else if (key === 'Enter') {
    parts.push('Enter');
  } else if (key === '/') {
    parts.push('/');
  } else if (key === '?') {
    parts.push('?');
  } else {
    parts.push(key.toUpperCase());
  }
  
  return parts.join(' + ');
}

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded shadow-sm">
      {children}
    </kbd>
  );
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContext?: ShortcutContext;
}

export function KeyboardShortcutsModal({ isOpen, onClose, currentContext }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter shortcuts by context
  const relevantShortcuts = SHORTCUTS.filter((shortcut) => {
    if (currentContext) {
      return shortcut.context.includes(currentContext) || shortcut.context.includes('global');
    }
    return true;
  });

  // Group by context
  const grouped: Record<string, Shortcut[]> = {
    Global: [],
    'Deal Detail': [],
    Dashboard: [],
  };

  relevantShortcuts.forEach((shortcut) => {
    if (shortcut.context.includes('global')) {
      grouped.Global.push(shortcut);
    }
    if (shortcut.context.includes('deal-detail')) {
      grouped['Deal Detail'].push(shortcut);
    }
    if (shortcut.context.includes('dashboard')) {
      grouped.Dashboard.push(shortcut);
    }
  });

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="bg-white rounded-lg p-6 max-w-2xl w-full my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="shortcuts-title" className="text-2xl font-bold text-slate-900">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="touch-target text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close shortcuts modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(grouped).map(([context, shortcuts]) => {
            if (shortcuts.length === 0) return null;

            return (
              <div key={context}>
                <h3 className="text-lg font-semibold text-slate-800 mb-3">{context}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Shortcut</th>
                        <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shortcuts.map((shortcut, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <KeyBadge>
                              {formatKey(shortcut.key, shortcut.shift, shortcut.ctrl, shortcut.alt, shortcut.meta)}
                            </KeyBadge>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">{shortcut.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Shortcuts are disabled when typing in input fields or text areas.
          </p>
        </div>
      </div>
    </div>
  );
}
