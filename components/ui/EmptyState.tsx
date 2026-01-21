import React from 'react';
import { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
      <div className="rounded-full bg-white p-6 mb-6 shadow-sm border border-slate-200">
        <Icon className="h-14 w-14 text-slate-400" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-base text-slate-600 max-w-lg mb-8 leading-relaxed">{description}</p>
      <div className="flex flex-wrap items-center gap-3 justify-center">
        <button
          onClick={onAction}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all hover:shadow-lg hover:scale-105 active:scale-95"
        >
          {actionLabel}
        </button>
        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-white hover:border-slate-400 transition-all hover:shadow-md"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
