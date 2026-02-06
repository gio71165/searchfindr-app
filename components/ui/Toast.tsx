'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, RefreshCw } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastComponent({ toast, onRemove }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration ?? 3000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300); // Wait for animation
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const config = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-emerald-600',
      border: 'border-emerald-500',
      text: 'text-white',
      iconColor: 'text-white',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-600',
      border: 'border-red-500',
      text: 'text-white',
      iconColor: 'text-white',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-600',
      border: 'border-blue-500',
      text: 'text-white',
      iconColor: 'text-white',
    },
  };

  const style = config[toast.type];
  const Icon = style.icon;

  return (
    <div
      className={`
        ${style.bg} ${style.border} ${style.text}
        border rounded-lg shadow-lg p-4 mb-3
        flex items-start gap-3 min-w-[300px] max-w-md
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon className={`h-5 w-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        <p className="text-sm font-medium">{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              handleRemove();
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium underline hover:no-underline"
          >
            <RefreshCw className="h-3 w-3" />
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleRemove}
        className={`${style.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col items-end"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Toast manager hook
let toastIdCounter = 0;
const toastListeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

export function showToast(
  message: string, 
  type: ToastType = 'info', 
  duration?: number,
  action?: { label: string; onClick: () => void }
) {
  const id = `toast-${++toastIdCounter}`;
  const newToast: Toast = { id, message, type, duration, action };
  toasts = [...toasts, newToast];
  notifyListeners();
  return id;
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

export function useToast() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setCurrentToasts([...toasts]);
    toastListeners.add(setCurrentToasts);
    return () => {
      toastListeners.delete(setCurrentToasts);
    };
  }, []);

  return {
    toasts: currentToasts,
    showToast,
    removeToast,
  };
}
