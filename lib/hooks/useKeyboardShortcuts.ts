'use client';

import { useEffect, useCallback, useRef } from 'react';

export type ShortcutContext = 'global' | 'dashboard' | 'deal-detail';

export interface ShortcutConfig {
  key: string;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description: string;
  context: ShortcutContext[];
  preventDefault?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 * Prevents shortcuts from triggering when user is typing in inputs/textareas
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  enabled: boolean = true
) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const isTyping = useCallback(() => {
    if (typeof document === 'undefined') return false;
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isInput = tagName === 'input' && (activeElement as HTMLInputElement).type !== 'checkbox' && (activeElement as HTMLInputElement).type !== 'radio';
    const isTextarea = tagName === 'textarea';
    const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';

    return isInput || isTextarea || isContentEditable;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing
      if (isTyping()) return;

      // Check for ESC key first - allow it to close modals
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('[role="dialog"], .modal, [data-modal="true"]');
        if (modals.length > 0) {
          // Find ESC shortcut for closing modals
          const escShortcut = shortcutsRef.current.find((shortcut) => 
            shortcut.key.toLowerCase() === 'escape' && 
            (shortcut.context.includes('global') || shortcut.context.length === 0)
          );
          if (escShortcut) {
            e.preventDefault();
            escShortcut.handler();
          }
          return;
        }
      }

      // Don't trigger other shortcuts if a modal is open (except ESC which we handled above)
      const modals = document.querySelectorAll('[role="dialog"], .modal, [data-modal="true"]');
      if (modals.length > 0 && e.key !== 'Escape') {
        return;
      }

      const matchingShortcut = shortcutsRef.current.find((shortcut) => {
        const keyMatch = shortcut.key.toLowerCase() === e.key.toLowerCase();
        const shiftMatch = shortcut.shift === undefined ? !e.shiftKey : shortcut.shift === e.shiftKey;
        const ctrlMatch = shortcut.ctrl === undefined ? !e.ctrlKey : shortcut.ctrl === e.ctrlKey;
        const altMatch = shortcut.alt === undefined ? !e.altKey : shortcut.alt === e.altKey;
        const metaMatch = shortcut.meta === undefined ? !e.metaKey : shortcut.meta === e.metaKey;

        return keyMatch && shiftMatch && ctrlMatch && altMatch && metaMatch;
      });

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault !== false) {
          e.preventDefault();
        }
        matchingShortcut.handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, isTyping]);
}

/**
 * Helper to create shortcut configs
 */
export function createShortcut(
  key: string,
  handler: () => void,
  description: string,
  context: ShortcutContext[],
  options?: {
    shift?: boolean;
    ctrl?: boolean;
    alt?: boolean;
    meta?: boolean;
    preventDefault?: boolean;
  }
): ShortcutConfig {
  return {
    key,
    handler,
    description,
    context,
    shift: options?.shift,
    ctrl: options?.ctrl,
    alt: options?.alt,
    meta: options?.meta,
    preventDefault: options?.preventDefault,
  };
}
