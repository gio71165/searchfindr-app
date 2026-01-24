'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Rocket, Check } from 'lucide-react';
import Link from 'next/link';

const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/dRm4gz1ReaTxct01lKawo00';
const STORAGE_KEY = 'exitIntentPopupShown';
const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function ExitIntentPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const hasShownRef = useRef(false);

  useEffect(() => {
    // Check if popup was shown recently
    const checkStorage = () => {
      if (typeof window === 'undefined') return false;
      
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      
      try {
        const { timestamp } = JSON.parse(stored);
        const now = Date.now();
        // If shown within last 24 hours, don't show again
        if (now - timestamp < STORAGE_EXPIRY_MS) {
          return true;
        }
      } catch {
        // Invalid storage, allow showing
      }
      
      return false;
    };

    // Don't show if already shown recently
    if (checkStorage()) {
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse is leaving from the very top of the viewport (within 5px)
      // This indicates user is actually trying to close the tab/window
      // Using a small threshold to avoid false positives
      if (e.clientY <= 5 && !hasShownRef.current) {
        hasShownRef.current = true;
        setIsVisible(true);
        
        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            timestamp: Date.now()
          }));
        }
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  // Handle ESC key
  useEffect(() => {
    if (!isVisible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 opacity-100"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-white/20 bg-gradient-to-br from-gray-900 to-gray-800 p-8 shadow-2xl transform transition-all duration-200 scale-100 opacity-100">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-500/20 p-3 border border-red-500/30">
              <Rocket className="h-8 w-8 text-red-400" />
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-bold text-white mb-4">
            Wait! 21/50 spots filled. Lock in $149/mo before spots run out.
          </h2>

          {/* Subheadline */}
          <p className="text-lg text-white/80 mb-6">
            After Feb 28, pricing increases to $249/mo.
          </p>

          {/* Benefits */}
          <div className="text-left mb-8 space-y-3">
            <p className="text-base font-semibold text-white mb-3">
              Early bird founders also get:
            </p>
            <div className="space-y-2">
              {[
                'Direct access to build product with you',
                'Your feature requests prioritized',
                'Lifetime price lock'
              ].map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/90">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <Link
            href={STRIPE_PAYMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClose}
            className="inline-block w-full px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105"
          >
            Lock in $149/mo Forever
          </Link>

          {/* Dismiss link */}
          <button
            onClick={handleClose}
            className="mt-4 text-sm text-white/60 hover:text-white/80 transition-colors"
          >
            No thanks, I'll pass
          </button>
        </div>
      </div>
    </div>
  );
}
