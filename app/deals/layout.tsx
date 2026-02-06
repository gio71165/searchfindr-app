'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function DealsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, hasValidSubscription } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user) return;
    if (!hasValidSubscription) {
      router.replace('/pricing?reason=subscription_required');
    }
  }, [loading, user, hasValidSubscription, router]);

  if (loading || !user || !hasValidSubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-slate-400">
            {!user ? 'Redirecting to login...' : 'Redirecting to subscription...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
