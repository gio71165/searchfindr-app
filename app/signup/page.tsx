'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Get subscription params from URL
  const tier = searchParams.get('tier') as 'self_funded' | 'search_fund' | null;
  const plan = searchParams.get('plan') as 'early_bird' | null;
  const billing = searchParams.get('billing') as 'monthly' | 'yearly' | null;

  // Check if already authenticated and redirect (non-blocking)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // If they have subscription params, go to checkout
        if (tier && plan && billing) {
          router.replace(`/pricing?checkout=true&tier=${tier}&plan=${plan}&billing=${billing}`);
        } else {
          router.replace('/dashboard');
        }
      }
    });
  }, [router, tier, plan, billing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?tier=${tier || ''}&plan=${plan || ''}&billing=${billing || ''}`,
        },
      });

      if (error) throw error;

      // If email confirmation is required, show message
      if (data.user && !data.session) {
        setErrorMsg('Please check your email to confirm your account before continuing.');
        setLoading(false);
        return;
      }

      // If we have a session immediately (email confirmation disabled), redirect to checkout
      if (data.session && tier && plan && billing) {
        router.push(`/pricing?checkout=true&tier=${tier}&plan=${plan}&billing=${billing}`);
      } else if (data.session) {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const planName = tier === 'self_funded' ? 'Self-Funded Searcher' : tier === 'search_fund' ? 'Traditional Search Fund' : null;

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-[#0b0f17] text-slate-100">
      {/* Subtle background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:28px_28px] opacity-30" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-14">
        <div className="grid w-full max-w-5xl grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          {/* Left marketing panel */}
          <section className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {planName ? `Signing up for ${planName}` : 'Create Your Account'}
            </div>

            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              {planName ? (
                <>
                  Start your <span className="text-emerald-400">7-day free trial</span> and lock in early bird pricing forever.
                </>
              ) : (
                <>
                  Deal screening that's <span className="text-indigo-300">fast</span>,{' '}
                  <span className="text-indigo-300">structured</span>, and{' '}
                  <span className="text-indigo-300">deal-locked</span>.
                </>
              )}
            </h1>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
              {planName ? (
                <>
                  Create your account to begin your subscription. After signup, you'll be redirected to complete your payment and start your free trial.
                </>
              ) : (
                <>
                  Upload CIMs, review on-market listings, and chat with an assistant that only uses your deal's analysis — not generic fluff.
                </>
              )}
            </p>

            {planName && (
              <div className="mt-6 space-y-3 text-sm text-slate-200">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                  <p>7-day free trial - no credit card required until trial ends</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                  <p>Lock in early bird pricing forever</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                  <p>Cancel anytime - no questions asked</p>
                </div>
              </div>
            )}
          </section>

          {/* Right auth card */}
          <section className="mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Create your account</h2>
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  Secure signup
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Email</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">Password</label>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 focus-within:border-indigo-400/60 focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
                    >
                      {showPw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Must be at least 8 characters
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">Confirm Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                  />
                </div>

                <AsyncButton
                  type="submit"
                  isLoading={loading}
                  loadingText="Creating account…"
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
                >
                  {planName ? 'Sign up & Continue to Checkout' : 'Create account'}
                </AsyncButton>

                <p className="text-center text-xs text-slate-400">
                  Already have an account?{' '}
                  <a href="/login" className="text-indigo-400 hover:text-indigo-300">
                    Log in
                  </a>
                </p>

                <p className="text-center text-xs text-slate-400">
                  By continuing, you agree to keep deal data private.
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  );
}
