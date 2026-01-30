'use client';

import { X, Shield, CreditCard } from 'lucide-react';
import { useEffect } from 'react';

interface TrustBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function TrustBoxModal({ isOpen, onClose, onContinue }: TrustBoxModalProps) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0b0f17] border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">
              Why do we need a card?
            </h2>
            <p className="text-sm text-slate-400">
              We want to be transparent about this
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="mb-6 space-y-4">
          <p className="text-slate-300 leading-relaxed">
            To prevent bot abuse and ensure our AI resources stay dedicated to serious searchers. 
            <span className="font-semibold text-white"> You won't be charged a cent today.</span>
          </p>
          <p className="text-slate-300 leading-relaxed">
            Think of it as reserving your early-bird spot while you test the engine.
          </p>
          
          {/* Trust indicators */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 mt-4">
            <div className="flex items-start gap-3 mb-3">
              <CreditCard className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-1">Your card is secure</p>
                <p className="text-xs text-slate-400">
                  We use Stripe for secure payment processing. Your card details are encrypted and never stored on our servers.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-1">7-day free trial</p>
                <p className="text-xs text-slate-400">
                  Full access to all features. No charges until Day 8. Cancel anytime with one click.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg font-semibold hover:bg-slate-800 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30"
          >
            Continue to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
