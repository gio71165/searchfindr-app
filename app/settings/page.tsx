'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlayCircle, ExternalLink, CreditCard, User, Search, Key, Shield, Chrome, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { OnboardingRepository } from '@/lib/data-access/onboarding';
import { showToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ComplianceSettings } from '@/components/settings/ComplianceSettings';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { SearchCriteriaSettings } from '@/components/settings/SearchCriteriaSettings';
import { ApiKeysSettings } from '@/components/settings/ApiKeysSettings';
import { SubscriptionCard } from '@/components/settings/SubscriptionCard';

type TabId = 'subscription' | 'profile' | 'search' | 'api' | 'compliance' | 'extensions' | 'onboarding';

const tabs = [
  { id: 'subscription' as TabId, label: 'Subscription', icon: CreditCard },
  { id: 'profile' as TabId, label: 'Profile', icon: User },
  { id: 'search' as TabId, label: 'Search Criteria', icon: Search },
  { id: 'api' as TabId, label: 'API Keys', icon: Key },
  { id: 'compliance' as TabId, label: 'Compliance', icon: Shield },
  { id: 'extensions' as TabId, label: 'Extensions', icon: Chrome },
  { id: 'onboarding' as TabId, label: 'Onboarding', icon: PlayCircle },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('subscription');
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-200 px-8 py-6">
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className="h-6 w-6 text-slate-600" />
              <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            </div>
            <p className="text-slate-600">Manage your account preferences and settings.</p>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Tab Navigation - Sidebar */}
            <div className="lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50">
              <nav className="p-4 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                          : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-8">
              {activeTab === 'subscription' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-6">Subscription & Billing</h2>
                  <SubscriptionCard />
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Need to cancel?</strong> Click "Manage Subscription" above to access your Stripe billing portal where you can cancel your subscription at any time.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-6">Profile Information</h2>
                  <ProfileSettings />
                </div>
              )}

              {activeTab === 'search' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-6">Search Criteria</h2>
                  <div data-onboarding="search-criteria">
                    <SearchCriteriaSettings />
                  </div>
                </div>
              )}

              {activeTab === 'api' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-6">API Keys</h2>
                  <ApiKeysSettings />
                </div>
              )}

              {activeTab === 'compliance' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-6">SBA Compliance Settings</h2>
                  <ComplianceSettings />
                </div>
              )}

              {activeTab === 'extensions' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-6">Chrome Extension</h2>
                  <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
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
                </div>
              )}

              {activeTab === 'onboarding' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-6">Onboarding</h2>
                  <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                    {onboardingCompleted === null ? (
                      <div className="flex items-center justify-center py-4">
                        <LoadingSpinner size="md" className="mr-2" />
                        <p className="text-sm text-slate-600">Loading...</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 mb-4">
                        {onboardingCompleted === false
                          ? "Complete the onboarding tutorial to learn how to use SearchFindr."
                          : "You've completed the onboarding tutorial. You can view it again anytime."}
                      </p>
                    )}
                    <button
                      onClick={handleShowOnboarding}
                      disabled={!user || onboardingCompleted === null}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Show Onboarding Checklist
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
