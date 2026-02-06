'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export function ErrorState({ 
  title = "Something went wrong",
  message,
  onRetry,
  retryText = "Try again"
}: ErrorStateProps) {
  return (
    <div className="rounded-xl border-2 border-red-500/30 bg-red-950/20 p-6 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-red-400 mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-slate-300 mb-4">
        {message}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-danger inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {retryText}
        </button>
      )}
    </div>
  );
}
