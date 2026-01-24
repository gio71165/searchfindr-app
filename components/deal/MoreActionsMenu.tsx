'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Archive, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';

interface MoreActionsMenuProps {
  dealId: string;
  isArchived?: boolean;
  onArchive?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function MoreActionsMenu({
  dealId,
  isArchived = false,
  onArchive,
  onDelete,
  className = '',
}: MoreActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onArchive?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onDelete?.();
  };

  return (
    <div className={`relative ${className}`} ref={menuRef} data-no-link>
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        icon={<MoreVertical className="h-4 w-4" />}
        label="More actions"
        className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900"
      />

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
            <div className="py-1">
              {!isArchived && (
                <button
                  onClick={handleArchive}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left min-h-[44px]"
                >
                  <Archive className="h-4 w-4" />
                  Archive deal
                </button>
              )}
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left min-h-[44px]"
              >
                <Trash2 className="h-4 w-4" />
                {isArchived ? 'Delete permanently' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
