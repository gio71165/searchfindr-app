'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { OnboardingRepository } from '@/lib/data-access/onboarding';
import confetti from 'canvas-confetti';

interface ChecklistItem {
  id: string;
  label: string;
  eventName: string; // Custom event name to listen for
  completed: boolean;
}

const CHECKLIST_ITEMS: Omit<ChecklistItem, 'completed'>[] = [
  { id: 'open-cim', label: 'Open a CIM deal', eventName: 'onboarding:cim-opened' },
  { id: 'upload-sample-cim', label: 'Upload sample CIM', eventName: 'onboarding:sample-cim-uploaded' },
  { id: 'run-ai', label: 'Run AI analysis', eventName: 'onboarding:ai-analysis-run' },
  { id: 'use-chat', label: 'Use AI chat', eventName: 'onboarding:chat-used' },
  { id: 'search-criteria', label: 'Set search criteria', eventName: 'onboarding:search-criteria-set' },
  { id: 'proceed-deal', label: 'Mark a deal as Proceed', eventName: 'onboarding:deal-proceeded' },
  { id: 'financials-tab', label: 'View Financials tab', eventName: 'onboarding:financials-tab-viewed' },
  { id: 'on-market', label: 'Browse On-Market deals', eventName: 'onboarding:on-market-viewed' },
  { id: 'off-market', label: 'Browse Off-Market deals', eventName: 'onboarding:off-market-viewed' },
  { id: 'today', label: 'View Today page', eventName: 'onboarding:today-viewed' },
  { id: 'brokers', label: 'View Brokers page', eventName: 'onboarding:brokers-viewed' },
];

export function OnboardingChecklist() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded so users see it
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [showSampleCimButton, setShowSampleCimButton] = useState(true);

  // Load checklist state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const loadChecklist = () => {
      const saved = localStorage.getItem('onboarding_checklist');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setItems(parsed.items || CHECKLIST_ITEMS.map(item => ({ ...item, completed: false })));
          setShowSampleCimButton(!parsed.sampleCimUploaded);
        } catch (e) {
          // Start fresh if parse fails
          setItems(CHECKLIST_ITEMS.map(item => ({ ...item, completed: false })));
        }
      } else {
        // No saved state - start fresh
        setItems(CHECKLIST_ITEMS.map(item => ({ ...item, completed: false })));
      }
    };

    loadChecklist();

    // Also listen for storage events (when localStorage is cleared from another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'onboarding_checklist') {
        loadChecklist();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Listen for reset events (when user clicks "Show Onboarding Checklist" in settings)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleReset = async () => {
      // Reset checklist items to not completed
      setItems(CHECKLIST_ITEMS.map(item => ({ ...item, completed: false })));
      setShowSampleCimButton(true);
      setOnboardingCompleted(false);
      
      // Re-check database status to ensure it's updated
      if (user) {
        try {
          const onboardingRepo = new OnboardingRepository(supabase);
          const completed = await onboardingRepo.hasCompletedOnboarding(user.id);
          setOnboardingCompleted(completed);
        } catch (error) {
          console.error('Error checking onboarding status after reset:', error);
        }
      }
    };

    window.addEventListener('onboarding:reset', handleReset);
    return () => window.removeEventListener('onboarding:reset', handleReset);
  }, [user]);

  // Check if onboarding is completed - also listen for reset events
  useEffect(() => {
    if (!user) return;

    async function checkCompletion() {
      try {
        const onboardingRepo = new OnboardingRepository(supabase);
        const completed = await onboardingRepo.hasCompletedOnboarding(user.id);
        setOnboardingCompleted(completed);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    }

    checkCompletion();

    // Re-check when page becomes visible (after navigation from settings)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkCompletion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Calculate progress
  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isComplete = progress >= 100;

  // Show confetti and mark as completed when reaching 100%
  useEffect(() => {
    if (isComplete && !onboardingCompleted && user) {
      // Trigger confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Mark onboarding as completed in database
      const onboardingRepo = new OnboardingRepository(supabase);
      onboardingRepo.completeOnboarding(user.id).then(() => {
        setOnboardingCompleted(true);
      }).catch(console.error);

      return () => clearInterval(interval);
    }
  }, [isComplete, onboardingCompleted, user]);

  // Save checklist state to localStorage
  const saveChecklist = useCallback((updatedItems: ChecklistItem[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('onboarding_checklist', JSON.stringify({
      items: updatedItems,
      sampleCimUploaded: !showSampleCimButton,
    }));
  }, [showSampleCimButton]);

  // Mark item as completed
  const markCompleted = useCallback((itemId: string) => {
    setItems(prev => {
      const updated = prev.map(item => 
        item.id === itemId ? { ...item, completed: true } : item
      );
      saveChecklist(updated);
      return updated;
    });
  }, [saveChecklist]);

  // Listen for onboarding events
  useEffect(() => {
    const handleEvent = (event: CustomEvent) => {
      const eventName = event.detail?.eventName || event.type;
      const item = items.find(i => i.eventName === eventName);
      if (item && !item.completed) {
        markCompleted(item.id);
      }
    };

    // Listen for all checklist events
    CHECKLIST_ITEMS.forEach(item => {
      window.addEventListener(item.eventName, handleEvent as EventListener);
    });

    return () => {
      CHECKLIST_ITEMS.forEach(item => {
        window.removeEventListener(item.eventName, handleEvent as EventListener);
      });
    };
  }, [items, markCompleted]);

  // Track page views
  useEffect(() => {
    if (!pathname) return;

    // Track different page views
    if (pathname.includes('/financials')) {
      window.dispatchEvent(new CustomEvent('onboarding:financials-tab-viewed'));
    } else if (pathname.includes('/on-market')) {
      window.dispatchEvent(new CustomEvent('onboarding:on-market-viewed'));
    } else if (pathname.includes('/off-market')) {
      window.dispatchEvent(new CustomEvent('onboarding:off-market-viewed'));
    } else if (pathname.includes('/today')) {
      window.dispatchEvent(new CustomEvent('onboarding:today-viewed'));
    } else if (pathname.includes('/brokers')) {
      window.dispatchEvent(new CustomEvent('onboarding:brokers-viewed'));
    }
  }, [pathname]);

  // Handle sample CIM upload
  const handleUploadSampleCim = async () => {
    if (!user) return;

    try {
      // Fetch sample CIM from public folder
      const response = await fetch('/sample-cim.pdf');
      if (!response.ok) {
        alert('Sample CIM file not found. Please upload your own CIM file.');
        return;
      }
      
      const blob = await response.blob();
      
      // Validate it's actually a PDF by checking the blob type and content
      if (blob.type && !blob.type.includes('pdf') && blob.type !== 'application/octet-stream') {
        alert('Sample CIM file is not a valid PDF. Please upload your own CIM file.');
        return;
      }
      
      // Check file size (should be reasonable for a PDF)
      if (blob.size < 100 || blob.size > 50 * 1024 * 1024) {
        alert('Sample CIM file size is invalid. Please upload your own CIM file.');
        return;
      }
      
      // Read first bytes to verify it's a PDF (PDF starts with %PDF)
      const firstBytes = await blob.slice(0, 4).text();
      if (!firstBytes.startsWith('%PDF')) {
        alert('Sample CIM file is not a valid PDF. Please upload your own CIM file.');
        return;
      }
      
      const file = new File([blob], 'sample-cim.pdf', { type: 'application/pdf' });
      
      // Upload to Supabase storage
      const fileExt = 'pdf';
      const fileName = `${Date.now()}-sample-cim.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('cims')
        .upload(filePath, file);

      if (storageError) {
        throw new Error('Failed to upload sample CIM');
      }

      // Create deal record
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

      if (!profile?.workspace_id) {
        throw new Error('Missing workspace');
      }

      const { data: insertData, error: insertError } = await supabase
        .from('companies')
        .insert({
          company_name: 'Sample Deal - Manufacturing Company',
          source_type: 'cim_pdf',
          cim_storage_path: storageData?.path || filePath,
          user_id: user.id,
          workspace_id: profile.workspace_id,
        })
        .select('id')
        .single();

      if (insertError || !insertData) {
        throw new Error('Failed to create deal record');
      }

      // Process the CIM
      const token = session.access_token;
      const processResponse = await fetch('/api/process-cim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId: insertData.id,
          cimStoragePath: storageData?.path || filePath,
          companyName: 'Sample Deal - Manufacturing Company',
        }),
      });

      if (!processResponse.ok) {
        const errorText = await processResponse.text();
        let errorMessage = 'Failed to process sample CIM';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Mark as completed and hide button
      markCompleted('upload-sample-cim');
      setShowSampleCimButton(false);
      window.dispatchEvent(new CustomEvent('onboarding:sample-cim-uploaded'));
      
      // Navigate to the deal
      window.location.href = `/deals/${insertData.id}`;
    } catch (error) {
      console.error('Error uploading sample CIM:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload sample CIM.';
      
      // Provide helpful error message
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        alert('Sample CIM file is not available. Please upload your own CIM file from the CIMs page.');
      } else if (errorMessage.includes('not a valid PDF')) {
        alert('The sample CIM file is corrupted or invalid. Please upload your own CIM file.');
      } else if (errorMessage.includes('CSV') || errorMessage.includes('Invalid file type')) {
        alert('The sample CIM file format is invalid. Please upload your own PDF, DOCX, or DOC file.');
      } else {
        alert(errorMessage + ' Please try uploading your own CIM file.');
      }
    }
  };

  // Don't show if onboarding is marked as completed in database AND progress is 100%
  // But allow showing if checklist was just reset (localStorage cleared)
  const hasChecklistData = typeof window !== 'undefined' && localStorage.getItem('onboarding_checklist');
  const shouldHide = onboardingCompleted && isComplete && hasChecklistData;
  if (shouldHide) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">Getting Started</h3>
              <p className="text-xs text-slate-500">
                {completedCount} of {totalCount} completed
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-emerald-700">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          )}
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-slate-200">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Checklist items */}
        {isExpanded && (
          <div className="max-h-96 overflow-y-auto p-4 space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  item.completed ? 'bg-emerald-50' : 'hover:bg-slate-50'
                }`}
              >
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300 flex-shrink-0" />
                )}
                <span
                  className={`text-sm flex-1 ${
                    item.completed
                      ? 'text-emerald-700 line-through'
                      : 'text-slate-700'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ))}

            {/* Sample CIM button - only show if not completed */}
            {showSampleCimButton && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={handleUploadSampleCim}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Upload Sample CIM
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
