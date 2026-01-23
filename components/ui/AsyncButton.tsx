'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoadingDots } from './LoadingSpinner';

interface AsyncButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

export function AsyncButton({ 
  isLoading = false,
  loadingText,
  children,
  disabled,
  className = '',
  ...props 
}: AsyncButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${className} ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <LoadingDots />
          {loadingText || children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
