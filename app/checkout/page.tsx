'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startCheckout() {
      const tier = searchParams.get('tier') as 'self_funded' | 'search_fund' | null;
      const plan = searchParams.get('plan') as 'early_bird' | null;
      const billing = searchParams.get('billing') as 'monthly' | 'yearly' | null;

      if (!tier || !plan || !billing) {
        setError('Missing subscription parameters');
        setTimeout(() => router.push('/pricing'), 3000);
        return;
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not authenticated, redirect to signup
        router.push(`/signup?tier=${tier}&plan=${plan}&billing=${billing}`);
        return;
      }

      // User is authenticated, create checkout session
      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tier,
            plan,
            billingCycle: billing,
            userId: user.id,
            email: user.email,
          }),
        });

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setTimeout(() => router.push('/pricing'), 3000);
          return;
        }

        if (data.url) {
          // Redirect to Stripe checkout
          window.location.href = data.url;
        } else {
          setError('Failed to create checkout session');
          setTimeout(() => router.push('/pricing'), 3000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start checkout');
        setTimeout(() => router.push('/pricing'), 3000);
      }
    }

    startCheckout();
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">⚠️</div>
          <h1 className="text-xl font-semibold mb-2">Checkout Error</h1>
          <p className="text-slate-400 mb-4">{error}</p>
          <p className="text-sm text-slate-500">Redirecting to pricing page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <h1 className="text-xl font-semibold mb-2">Starting Checkout...</h1>
        <p className="text-slate-400">Redirecting to secure payment page</p>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}
