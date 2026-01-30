'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { OnboardingRepository } from '@/lib/data-access/onboarding';
import { showToast } from '@/components/ui/Toast';
import confetti from 'canvas-confetti';

interface OnboardingStep {
  id: string;
  target: string; // CSS selector or data attribute
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'navigate' | 'fill-form' | 'modal' | 'highlight';
  nextRoute?: string;
  waitForEvent?: string; // Event name to wait for
  skipValidation?: boolean; // For modal steps that just need "Got it" click
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: 'Welcome to SearchFindr!',
    content: "Let's get you set up in 2 minutes. We'll guide you through the key features step by step.",
    placement: 'center',
    action: 'modal',
    skipValidation: true,
  },
  {
    id: 'search-criteria',
    target: '[data-onboarding="search-criteria"]',
    title: 'Set Your Search Criteria',
    content: "This is where you set your search preferences. Click 'New Criteria' to define what you're looking for: industries, geography, deal size, revenue, and EBITDA ranges. This helps us match you with the right deals.\n\nYou can set this up now or skip to continue the tour.",
    placement: 'bottom',
    action: 'highlight',
    skipValidation: true,
  },
  {
    id: 'filter-buttons',
    target: '[data-onboarding="filter-buttons"]',
    title: 'Filter Your Deals',
    content: 'Use these filters to find deals by stage, verdict, or source type. Click any filter button to narrow down your deals.\n\nTry clicking a filter or skip to continue.',
    placement: 'bottom',
    action: 'highlight',
    skipValidation: true,
  },
  {
    id: 'stages-explanation',
    target: 'body',
    title: 'Understanding Deal Stages',
    content: 'Deals progress through stages: New → Reviewing → IOI → LOI → DD → Closed. Each stage represents a different phase of your deal evaluation process.',
    placement: 'center',
    action: 'modal',
    skipValidation: true,
  },
  {
    id: 'verdicts-explanation',
    target: 'body',
    title: 'Understanding Verdicts',
    content: 'Three verdicts guide your decisions:\n\n✅ Proceed → Move forward with this deal\n🅿️ Park → Interesting but not now, revisit later\n❌ Pass → Not a fit, decline',
    placement: 'center',
    action: 'modal',
    skipValidation: true,
  },
  {
    id: 'keyboard-shortcuts',
    target: 'body',
    title: 'Keyboard Shortcuts (Optional)',
    content: 'Power users love these shortcuts:\n\n• P = Proceed\n• K = Park\n• X = Pass\n• J/K = Navigate deals\n• / = Search\n• ? = Show all shortcuts',
    placement: 'center',
    action: 'modal',
    skipValidation: true,
  },
  {
    id: 'completion',
    target: 'body',
    title: "You're All Set! 🎉",
    content: "Ready to start analyzing deals and building your pipeline. Choose an option below to get started.",
    placement: 'center',
    action: 'modal',
    skipValidation: true,
  },
];

interface InteractiveOnboardingProps {
  isOpen: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
  startStep?: number;
}

export function InteractiveOnboarding({ 
  isOpen, 
  onComplete, 
  onDismiss,
  startStep = 0 
}: InteractiveOnboardingProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(startStep);
  const [isActive, setIsActive] = useState(isOpen);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [spotlightPosition, setSpotlightPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStepData = ONBOARDING_STEPS[currentStep];

  // Update active state when isOpen changes
  useEffect(() => {
    setIsActive(isOpen);
    if (isOpen) {
      setCurrentStep(startStep);
    }
  }, [isOpen, startStep]);

  // Define completeOnboarding first (used by nextStep)
  const completeOnboarding = useCallback(async () => {
    if (!user || isCompleting) return;

    setIsCompleting(true);
    try {
      const onboardingRepo = new OnboardingRepository(supabase);
      await onboardingRepo.completeOnboarding(user.id);
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      showToast('Onboarding completed! 🎉', 'success', 3000);
      
      setTimeout(() => {
        setIsActive(false);
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      showToast('Failed to save onboarding status', 'error', 3000);
      setIsCompleting(false);
    }
  }, [user, isCompleting, onComplete]);

  // Define nextStep and previousStep
  const nextStep = useCallback(async () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      // Save progress
      if (user) {
        try {
          const onboardingRepo = new OnboardingRepository(supabase);
          await onboardingRepo.saveProgress(user.id, currentStep + 1);
        } catch (error) {
          console.error('Error saving onboarding progress:', error);
        }
      }

      setCurrentStep(currentStep + 1);
      
      // Navigate if needed
      const nextStepData = ONBOARDING_STEPS[currentStep + 1];
      if (nextStepData?.nextRoute && pathname !== nextStepData.nextRoute) {
        router.push(nextStepData.nextRoute);
      }
    } else {
      await completeOnboarding();
    }
  }, [currentStep, user, router, pathname, completeOnboarding]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      
      const prevStepData = ONBOARDING_STEPS[currentStep - 1];
      if (prevStepData?.nextRoute && pathname !== prevStepData.nextRoute) {
        router.push(prevStepData.nextRoute);
      }
    }
  }, [currentStep, router, pathname]);

  // Handle step validation events (optional - for future use)
  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const handleEvent = async () => {
      if (currentStepData.waitForEvent) {
        // Auto-advance when event is triggered (optional)
        nextStep();
      }
    };

    if (currentStepData.waitForEvent) {
      window.addEventListener(currentStepData.waitForEvent, handleEvent);
      return () => {
        window.removeEventListener(currentStepData.waitForEvent!, handleEvent);
      };
    }
  }, [currentStep, isActive, currentStepData, nextStep]);

  // Calculate tooltip position to avoid blocking highlighted element
  const calculateTooltipPosition = useCallback((element: HTMLElement, placement: string) => {
    const rect = element.getBoundingClientRect();
    const tooltipWidth = 400; // max-w-md
    const tooltipHeight = 300; // approximate
    const spacing = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = rect.top - tooltipHeight - spacing;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        // Ensure it doesn't go off screen
        if (top < 0) top = rect.bottom + spacing;
        if (left < 10) left = 10;
        if (left + tooltipWidth > viewportWidth - 10) left = viewportWidth - tooltipWidth - 10;
        break;
      case 'bottom':
        top = rect.bottom + spacing;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        // Ensure it doesn't go off screen
        if (top + tooltipHeight > viewportHeight - 10) top = rect.top - tooltipHeight - spacing;
        if (left < 10) left = 10;
        if (left + tooltipWidth > viewportWidth - 10) left = viewportWidth - tooltipWidth - 10;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - spacing;
        // Ensure it doesn't go off screen
        if (left < 10) left = rect.right + spacing;
        if (top < 10) top = 10;
        if (top + tooltipHeight > viewportHeight - 10) top = viewportHeight - tooltipHeight - 10;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + spacing;
        // Ensure it doesn't go off screen
        if (left + tooltipWidth > viewportWidth - 10) left = rect.left - tooltipWidth - spacing;
        if (top < 10) top = 10;
        if (top + tooltipHeight > viewportHeight - 10) top = viewportHeight - tooltipHeight - 10;
        break;
      default:
        // Center for modal steps
        top = viewportHeight / 2 - tooltipHeight / 2;
        left = viewportWidth / 2 - tooltipWidth / 2;
    }

    return { top: Math.max(10, top), left: Math.max(10, left) };
  }, []);

  // Highlight element and create spotlight effect
  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const updateHighlight = () => {
      let element: HTMLElement | null = null;

      if (currentStepData.target === 'body' || currentStepData.action === 'modal') {
        // Center modal - no spotlight needed
        setHighlightedElement(null);
        setSpotlightPosition(null);
        setTooltipPosition(null);
        return;
      }

      // Check if target is a data attribute selector
      if (currentStepData.target.startsWith('[data-onboarding=')) {
        const match = currentStepData.target.match(/\[data-onboarding="([^"]+)"\]/);
        if (match) {
          element = document.querySelector(`[data-onboarding="${match[1]}"]`) as HTMLElement;
        }
      } else {
        // Fallback to CSS selector
        element = document.querySelector(currentStepData.target) as HTMLElement;
      }

      if (element) {
        setHighlightedElement(element);
        
        // Scroll element into view smoothly
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        // Calculate spotlight position
        const rect = element.getBoundingClientRect();
        setSpotlightPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width + 20,
          height: rect.height + 20,
        });

        // Calculate tooltip position (out of the way)
        const tooltipPos = calculateTooltipPosition(element, currentStepData.placement);
        setTooltipPosition(tooltipPos);

        // Add highlight class for visual feedback
        element.classList.add('onboarding-highlight');
        
        // Add pulsing animation class
        element.style.transition = 'all 0.3s ease';
        element.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.3)';
      } else {
        // Element not found - check periodically
        if (!checkIntervalRef.current) {
          checkIntervalRef.current = setInterval(() => {
            updateHighlight();
          }, 500);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(updateHighlight, 100);

    return () => {
      clearTimeout(timer);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      highlightedElement?.classList.remove('onboarding-highlight');
      if (highlightedElement) {
        highlightedElement.style.boxShadow = '';
      }
    };
  }, [currentStep, isActive, currentStepData, calculateTooltipPosition]);

  const handleSkip = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_dismissed', 'true');
    }
    setIsActive(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isActive || !currentStepData) return null;

  const isModalStep = currentStepData.action === 'modal' || currentStepData.target === 'body';
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <>
      {/* Dark overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black/70 z-[9998] transition-opacity"
        onClick={isModalStep ? undefined : (e) => {
          // Prevent clicks outside highlighted element
          if (highlightedElement && !highlightedElement.contains(e.target as Node)) {
            e.stopPropagation();
          }
        }}
      />

      {/* Spotlight cutout - only for non-modal steps */}
      {spotlightPosition && !isModalStep && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `${spotlightPosition.x - spotlightPosition.width / 2}px`,
            top: `${spotlightPosition.y - spotlightPosition.height / 2}px`,
            width: `${spotlightPosition.width}px`,
            height: `${spotlightPosition.height}px`,
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            border: '3px solid #10b981',
            transition: 'all 0.3s ease',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      )}

      {/* Instruction tooltip - positioned intelligently */}
      <div
        ref={tooltipRef}
        className={`fixed z-[10000] bg-white rounded-lg shadow-2xl p-6 max-w-md onboarding-tooltip ${
          isModalStep 
            ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' 
            : ''
        }`}
        style={
          !isModalStep && tooltipPosition
            ? {
                top: `${tooltipPosition.top}px`,
                left: `${tooltipPosition.left}px`,
                transform: 'none',
              }
            : undefined
        }
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-slate-900 mb-1">{currentStepData.title}</h3>
            <p className="text-xs text-slate-500">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-600 transition-colors ml-4"
            aria-label="Skip onboarding"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-slate-700 mb-6 whitespace-pre-line">
          {currentStepData.content}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep ? 'bg-emerald-500' : i < currentStep ? 'bg-emerald-300' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={previousStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {/* Skip this step button - always available for non-modal steps */}
            {!isLastStep && !isModalStep && (
              <button
                onClick={nextStep}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                title="Skip this step"
              >
                Skip
              </button>
            )}

            {/* Next/Complete button */}
            {isLastStep ? (
              <button
                onClick={async () => {
                  await completeOnboarding();
                }}
                disabled={isCompleting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isCompleting ? 'Completing...' : 'Complete'}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {currentStepData.id === 'keyboard-shortcuts' ? 'Show me later' : 'Got it'}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .onboarding-highlight {
          position: relative;
          z-index: 10001;
        }
      `}</style>
    </>
  );
}
