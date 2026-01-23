'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { BrokerDashboard } from '@/components/dashboard/BrokerDashboard';

export default function BrokersPage() {
  const router = useRouter();
  const { user, workspaceId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [authLoading, user, workspaceId, router]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <BrokerDashboard />
      </div>
    </main>
  );
}
