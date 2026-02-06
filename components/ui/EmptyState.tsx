import React from 'react';
import { LucideIcon, Target, Play } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  showSampleOption = false,
  onSampleAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  showSampleOption?: boolean;
  onSampleAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-800 rounded-xl border-2 border-dashed border-slate-700">
      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700">
        <Icon className="h-10 w-10 text-slate-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-50 mb-3">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">{description}</p>
      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <button
          onClick={onAction}
          className="btn-primary btn-lg w-full min-h-[44px] touch-target flex items-center justify-center gap-2"
        >
          <Icon className="h-5 w-5" />
          {actionLabel}
        </button>
        {showSampleOption && onSampleAction && (
          <>
            <div className="flex items-center gap-2 w-full my-2">
              <div className="flex-1 h-px bg-slate-600"></div>
              <span className="text-sm text-slate-500">or try it first</span>
              <div className="flex-1 h-px bg-slate-600"></div>
            </div>
            <button
              onClick={onSampleAction}
              className="btn-ghost btn-lg w-full min-h-[44px] touch-target flex items-center justify-center gap-2"
            >
              <Play className="h-5 w-5" />
              Analyze Sample CIM
            </button>
            <p className="text-xs text-slate-400 mt-2">
              See how SearchFindr works with a demo deal
            </p>
          </>
        )}
        {secondaryActionLabel && onSecondaryAction && !showSampleOption && (
          <button
            onClick={onSecondaryAction}
            className="btn-ghost btn-lg w-full min-h-[44px] touch-target"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
