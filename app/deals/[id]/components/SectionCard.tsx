'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';

export function SectionCard({
  title,
  icon: Icon,
  badge,
  defaultOpen = false,
  borderColor = 'border-slate-200 dark:border-slate-700',
  bgColor = 'bg-white dark:bg-slate-800',
  children,
}: {
  title: string;
  icon?: LucideIcon;
  badge?: string | number;
  defaultOpen?: boolean;
  borderColor?: string;
  bgColor?: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} shadow-sm overflow-hidden`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {badge !== undefined && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
