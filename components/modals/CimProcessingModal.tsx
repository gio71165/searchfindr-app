'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { IconButton } from '@/components/ui/IconButton';
import { LoadingSteps, type LoadingStep } from '@/components/ui/LoadingSteps';

type ProcessingStage = 'uploading' | 'extracting' | 'analyzing' | 'generating' | 'finalizing' | 'complete' | 'error';

interface CimProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: ProcessingStage;
  error?: string | null;
  estimatedTimeRemaining?: number; // seconds
  onCancel?: () => void;
}

const STAGE_MESSAGES: Record<ProcessingStage, string> = {
  uploading: 'Uploading PDF...',
  extracting: 'Extracting text from CIM...',
  analyzing: 'AI analyzing deal structure...',
  generating: 'Generating red flags & recommendations...',
  finalizing: 'Finalizing analysis...',
  complete: 'Analysis complete!',
  error: 'Processing failed',
};

const STAGE_DESCRIPTIONS: Record<ProcessingStage, string> = {
  uploading: 'Uploading your CIM file to secure storage (0-2 seconds)',
  extracting: 'Reading and extracting text from the PDF document (2-10 seconds)',
  analyzing: 'AI is analyzing the deal structure, financials, and risks (10-30 seconds)',
  generating: 'Generating red flags, recommendations, and investment memo (30-50 seconds)',
  finalizing: 'Saving analysis results to your dashboard (50-60 seconds)',
  complete: 'Your CIM has been analyzed and is ready to review',
  error: 'An error occurred during processing',
};

const STAGE_PROGRESS: Record<ProcessingStage, number> = {
  uploading: 5,
  extracting: 20,
  analyzing: 50,
  generating: 80,
  finalizing: 95,
  complete: 100,
  error: 0,
};

export function CimProcessingModal({
  isOpen,
  onClose,
  stage,
  error,
  estimatedTimeRemaining,
  onCancel,
}: CimProcessingModalProps) {
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [stepDurations, setStepDurations] = useState<Record<string, number>>({});
  const [stepStartTimes, setStepStartTimes] = useState<Record<string, number>>({});

  // Track step durations
  useEffect(() => {
    if (!isOpen) return;
    
    const currentTime = Date.now();
    setStepStartTimes(prev => {
      if (!prev[stage]) {
        return { ...prev, [stage]: currentTime };
      }
      return prev;
    });

    // When stage completes, record duration
    if (stage === 'extracting' && stepStartTimes['uploading']) {
      const duration = Math.round((currentTime - stepStartTimes['uploading']) / 1000);
      setStepDurations(prev => ({ ...prev, uploading: duration }));
    }
    if (stage === 'analyzing' && stepStartTimes['extracting']) {
      const duration = Math.round((currentTime - stepStartTimes['extracting']) / 1000);
      setStepDurations(prev => ({ ...prev, extracting: duration }));
    }
    if (stage === 'generating' && stepStartTimes['analyzing']) {
      const duration = Math.round((currentTime - stepStartTimes['analyzing']) / 1000);
      setStepDurations(prev => ({ ...prev, analyzing: duration }));
    }
    if (stage === 'finalizing' && stepStartTimes['generating']) {
      const duration = Math.round((currentTime - stepStartTimes['generating']) / 1000);
      setStepDurations(prev => ({ ...prev, generating: duration }));
    }
    if (stage === 'complete' && stepStartTimes['finalizing']) {
      const duration = Math.round((currentTime - stepStartTimes['finalizing']) / 1000);
      setStepDurations(prev => ({ ...prev, finalizing: duration }));
    }
  }, [stage, isOpen, stepStartTimes]);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setTimeElapsed(0);
      setStepDurations({});
      setStepStartTimes({});
      return;
    }

    const targetProgress = STAGE_PROGRESS[stage] || 0;
    
    // Animate progress smoothly toward target
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= targetProgress) {
          return targetProgress;
        }
        // Smooth animation: move 2% per interval toward target
        const diff = targetProgress - prev;
        return Math.min(prev + Math.max(1, diff * 0.1), targetProgress);
      });
    }, 100);

    // Track elapsed time
    const startTime = Date.now();
    const timeInterval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(timeInterval);
    };
  }, [isOpen, stage]);

  if (!isOpen) return null;

  const isProcessing = stage !== 'complete' && stage !== 'error';
  const showCancel = isProcessing && onCancel;

  // Build loading steps
  const loadingSteps: LoadingStep[] = [
    {
      id: 'extracting',
      label: 'Extracting text from PDF...',
      status: stage === 'extracting' ? 'in-progress' : ['uploading'].includes(stage) ? 'pending' : 'completed',
      duration: stepDurations.extracting,
    },
    {
      id: 'analyzing',
      label: 'Analyzing financials...',
      status: stage === 'analyzing' ? 'in-progress' : ['uploading', 'extracting'].includes(stage) ? 'pending' : 'completed',
      duration: stepDurations.analyzing,
    },
    {
      id: 'generating',
      label: 'Detecting red flags...',
      status: stage === 'generating' ? 'in-progress' : ['uploading', 'extracting', 'analyzing'].includes(stage) ? 'pending' : 'completed',
      duration: stepDurations.generating,
    },
    {
      id: 'finalizing',
      label: 'Generating summary...',
      status: stage === 'finalizing' ? 'in-progress' : ['uploading', 'extracting', 'analyzing', 'generating'].includes(stage) ? 'pending' : 'completed',
      duration: stepDurations.finalizing,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 relative">
        {/* Close button (only show if not processing or on error) */}
        {(!isProcessing || (stage as string) === 'error') && (
          <IconButton
            onClick={onClose}
            icon={<X className="h-5 w-5" />}
            label="Close modal"
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          />
        )}

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {STAGE_MESSAGES[stage]}
          </h2>
          <p className="text-sm text-slate-600">
            {STAGE_DESCRIPTIONS[stage]}
          </p>
        </div>

        {/* Loading Steps */}
        {isProcessing && (
          <div className="mb-6">
            <LoadingSteps steps={loadingSteps} currentStepId={stage} />
            <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
              {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 ? (
                <span>
                  Estimated time remaining: <span className="font-medium text-emerald-600">{Math.round(estimatedTimeRemaining)}s</span>
                </span>
              ) : (
                <span>
                  Elapsed: <span className="font-medium">{timeElapsed}s</span>
                </span>
              )}
              <span className="font-medium text-slate-700">
                Expected: 30-60 seconds
              </span>
            </div>
          </div>
        )}

        {/* Error message */}
        {stage === 'error' && error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success message */}
        {stage === 'complete' && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-700">
              Your CIM has been successfully analyzed. You can now review the deal details.
            </p>
          </div>
        )}

        {/* Info message */}
        {isProcessing && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-1">
              Expected processing time: 30-60 seconds
            </p>
            <p className="text-xs text-blue-700">
              Your CIM is being analyzed. This typically takes 30-60 seconds depending on file size. Please don't close this window.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {showCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          )}
          {(!isProcessing || (stage as string) === 'error') && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors min-h-[44px]"
            >
              {stage === 'error' ? 'Close' : 'Done'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
