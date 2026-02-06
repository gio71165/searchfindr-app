'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft } from 'lucide-react';

export default function CoalitionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isCoalitionLeader } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isCoalitionLeader) {
      router.replace('/dashboard');
      return;
    }
  }, [loading, user, isCoalitionLeader, router]);

  if (loading || !user || !isCoalitionLeader) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-700/80 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/coalition/dashboard"
              className="flex items-center gap-3 text-slate-100 hover:text-white transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 text-xs font-semibold">
                SFC
              </div>
              <span className="font-semibold text-slate-100">Search Fund Coalition</span>
            </Link>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40">
              Coalition Edition
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
