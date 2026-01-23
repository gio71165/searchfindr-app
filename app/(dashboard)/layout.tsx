'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#F9FAFB]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">Loading SearchFindr...</p>
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
    <div className="flex h-screen overflow-hidden flex-col">
      <Navigation />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F9FAFB] lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}
