'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-slate-400">Loading SearchFindr...</p>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  
  // Only show full loading screen on very first load when we don't know if user exists
  // After that, show the layout and let children handle their own loading
  if (loading && !user) {
    return <LoadingScreen />;
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
