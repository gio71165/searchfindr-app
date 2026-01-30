'use client';

import { useState, useEffect } from 'react';

export function UndoToast({ 
  message, 
  onUndo, 
  duration = 5000,
  onClose 
}: {
  message: string;
  onUndo: () => void;
  duration?: number;
  onClose: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  
  // Reset timeLeft when duration changes (toast shown again)
  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [onClose, duration]);
  
  const handleUndo = () => {
    onUndo();
    onClose();
  };
  
  return (
    <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[320px] z-50 animate-slide-up">
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-100"
            style={{ width: `${(timeLeft / duration) * 100}%` }}
          />
        </div>
      </div>
      <button
        onClick={handleUndo}
        className="px-3 py-1 bg-white text-slate-900 rounded font-medium text-sm hover:bg-slate-100 transition-colors"
      >
        Undo
      </button>
    </div>
  );
}
