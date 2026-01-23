'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlayCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { OnboardingRepository } from '@/lib/data-access/onboarding';
import { showToast } from '@/components/ui/Toast';
import { ComplianceSettings } from '@/components/settings/ComplianceSettings';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { SearchCriteriaSettings } from '@/components/settings/SearchCriteriaSettings';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;

    async function checkOnboardingStatus() {
      if (!user) return;
      try {
        const onboardingRepo = new OnboardingRepository(supabase);
        const completed = await onboardingRepo.hasCompletedOnboarding(user.id);
        setOnboardingCompleted(completed);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    }

    checkOnboardingStatus();
  }, [user]);

  const handleShowOnboarding = async () => {
    if (!user) return;

    try {
      const onboardingRepo = new OnboardingRepository(supabase);
      
      // Check if user wants to restart or resume
      const hasCompleted = await onboardingRepo.hasCompletedOnboarding(user.id);
      
      // Reset onboarding status to restart checklist
      await onboardingRepo.resetOnboarding(user.id);
      
      // Clear localStorage flags
      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboarding_dismissed');
        localStorage.removeItem('onboarding_completed');
        localStorage.removeItem('onboarding_checklist');
        // Set resume step to 0 to start from beginning
        localStorage.setItem('onboarding_resume_step', '0');
        
        // Dispatch event to notify checklist component to reset
        window.dispatchEvent(new CustomEvent('onboarding:reset'));
      }
      
      setOnboardingCompleted(false);
      
      // Navigate to dashboard - onboarding will start there automatically
      // This is the SAME onboarding experience as new users get
      showToast('Onboarding checklist restarted', 'info', 1500);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      showToast('Failed to reset onboarding', 'error', 3000);
    }
  };

  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600 mb-8">Manage your account preferences and settings.</p>

          <div className="space-y-6">
            {/* Profile Information */}
            <ProfileSettings />

            {/* Search Criteria Section */}
            <div data-onboarding="search-criteria">
              <SearchCriteriaSettings />
            </div>

            {/* Onboarding Section */}
            <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
              <h2 className="font-semibold text-slate-900 mb-2">Onboarding</h2>
              <p className="text-sm text-slate-600 mb-4">
                {onboardingCompleted === false
                  ? "Complete the onboarding tutorial to learn how to use SearchFindr."
                  : onboardingCompleted === true
                  ? "You've completed the onboarding tutorial. You can view it again anytime."
                  : "Loading..."}
              </p>
              <button
                onClick={handleShowOnboarding}
                disabled={!user || onboardingCompleted === null}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayCircle className="h-4 w-4" />
                Show Onboarding Checklist
              </button>
            </div>

            {/* Chrome Extension Section */}
            <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
              <h2 className="font-semibold text-slate-900 mb-2">Chrome Extension</h2>
              <p className="text-sm text-slate-600 mb-4">
                Install the SearchFindr Chrome extension to capture on-market listings directly from your browser.
              </p>
              <a
                href="https://chromewebstore.google.com/detail/searchfindr/lenhmbalallphfadbfbpjimbfpmgeocj"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Download Chrome Extension
              </a>
            </div>

            {/* SBA Compliance Settings */}
            <ComplianceSettings />

            {/* Future Settings */}
            <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
              <h2 className="font-semibold text-slate-900 mb-2">Future Settings</h2>
              <p className="text-sm text-slate-600">
                This page will include preferences, notification settings, and more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
