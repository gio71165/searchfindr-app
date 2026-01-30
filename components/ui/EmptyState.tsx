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
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
      <div className="rounded-full bg-white p-6 mb-6 shadow-sm border border-slate-200">
        <Icon className="h-14 w-14 text-slate-400" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-base text-slate-600 max-w-md mx-auto mb-8 leading-relaxed">{description}</p>
      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <button
          onClick={onAction}
          className="w-full px-6 py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all hover:shadow-lg hover:scale-105 active:scale-95 touch-target flex items-center justify-center gap-2"
        >
          <Icon className="h-5 w-5" />
          {actionLabel}
        </button>
        {showSampleOption && onSampleAction && (
          <>
            <div className="flex items-center gap-2 w-full my-2">
              <div className="flex-1 h-px bg-slate-300"></div>
              <span className="text-sm text-slate-500">or try it first</span>
              <div className="flex-1 h-px bg-slate-300"></div>
            </div>
            <button
              onClick={onSampleAction}
              className="w-full px-6 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-white hover:border-slate-400 transition-all hover:shadow-md touch-target flex items-center justify-center gap-2"
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
            className="w-full px-6 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-white hover:border-slate-400 transition-all hover:shadow-md touch-target"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
