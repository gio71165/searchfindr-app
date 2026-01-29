'use client';

import { Check, Loader2 } from 'lucide-react';

export type LoadingStep = {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed';
  duration?: number; // Duration in seconds
};

interface LoadingStepsProps {
  steps: LoadingStep[];
  currentStepId?: string;
}

export function LoadingSteps({ steps, currentStepId }: LoadingStepsProps) {
  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const isActive = step.id === currentStepId || step.status === 'in-progress';
        const isCompleted = step.status === 'completed';
        const isPending = step.status === 'pending';

        return (
          <div
            key={step.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              isActive
                ? 'bg-blue-50 border border-blue-200'
                : isCompleted
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-slate-50 border border-slate-200'
            }`}
          >
            <div className="flex-shrink-0">
              {isCompleted ? (
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              ) : isActive ? (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm font-medium ${
                  isActive ? 'text-blue-900' : isCompleted ? 'text-emerald-900' : 'text-slate-600'
                }`}
              >
                {step.label}
              </div>
              {step.duration && isCompleted && (
                <div className="text-xs text-slate-500 mt-0.5">
                  Completed in {step.duration}s
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
