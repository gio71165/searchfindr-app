'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function LoadingScreen({ message = 'Loading SearchFindr...' }: { message?: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-slate-400">{message}</p>
      </div>
    </div>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, user, hasValidSubscription, refetchProfile } = useAuth();
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const checkedOnce = useRef(false);

  // Redirect to login when not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Require valid subscription (active or trialing) to access dashboard
  useEffect(() => {
    if (loading || !user) return;
    if (hasValidSubscription) {
      setPendingCheckout(false);
      return;
    }

    // Just returned from Stripe checkout? Give webhook time to run, then refetch
    const sessionId = searchParams.get('session_id');
    if (sessionId && !checkedOnce.current) {
      checkedOnce.current = true;
      setPendingCheckout(true);
      const t = setTimeout(async () => {
        await refetchProfile();
        setPendingCheckout(false);
      }, 3500);
      return () => clearTimeout(t);
    }

    if (sessionId) return; // still waiting for refetch
    router.replace('/pricing?reason=subscription_required');
  }, [loading, user, hasValidSubscription, router, searchParams, refetchProfile]);

  // Only show full loading screen on very first load when we don't know if user exists
  if (loading && !user) {
    return <LoadingScreen />;
  }

  // Not logged in — show loading while redirect runs
  if (!user) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // Waiting for subscription to activate after checkout
  if (pendingCheckout) {
    return <LoadingScreen message="Activating your subscription..." />;
  }

  // No valid subscription and not waiting — redirecting to pricing
  if (!hasValidSubscription) {
    return <LoadingScreen message="Redirecting to subscription..." />;
  }
  
  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Skip to content link - only visible on keyboard focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Navigation />
        <main id="main-content" className="flex-1 overflow-y-auto bg-slate-900 lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
