'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface OnboardingStepProps {
  title: string;
  description?: string;
  children: ReactNode;
  stepNumber: number;
  totalSteps: number;
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  previousLabel?: string;
  showPrevious?: boolean;
  showSkip?: boolean;
}

export function OnboardingStep({
  title,
  description,
  children,
  stepNumber,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  nextLabel = 'Next',
  previousLabel = 'Previous',
  showPrevious = true,
  showSkip = false,
}: OnboardingStepProps) {
  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-8 relative">
      {/* Close/Skip button */}
      {(showSkip || onSkip) && (
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">
            Step {stepNumber} of {totalSteps}
          </span>
          <span className="text-sm text-slate-500">
            {Math.round((stepNumber / totalSteps) * 100)}% complete
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">{title}</h2>
        {description && (
          <p className="text-slate-600 mb-6">{description}</p>
        )}
        <div>{children}</div>
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 justify-end">
        {showPrevious && onPrevious && (
          <button
            onClick={onPrevious}
            className="px-6 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {previousLabel}
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
