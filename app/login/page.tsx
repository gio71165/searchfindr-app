'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { Navigation } from '@/components/Navigation';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkAuth = async () => {
      try {
        // Use getSession() instead of getUser() - faster, uses cached session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          router.replace('/dashboard');
          return;
        }
      } catch (err) {
        // Silently fail - user just needs to log in
        console.error('Auth check error:', err);
      } finally {
        if (mounted) {
          setAuthChecking(false);
        }
      }
    };

    // Set a timeout to prevent hanging forever
    timeoutId = setTimeout(() => {
      if (mounted) {
        setAuthChecking(false);
      }
    }, 3000); // 3 second max wait

    checkAuth().finally(() => {
      if (mounted) {
        clearTimeout(timeoutId);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/dashboard');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <main className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

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
              SearchFindr Private Access
            </div>

            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Deal screening that's <span className="text-indigo-300">fast</span>,{' '}
              <span className="text-indigo-300">structured</span>, and{' '}
              <span className="text-indigo-300">deal-locked</span>.
            </h1>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
              Upload CIMs, review on-market listings, and chat with an assistant that only uses your deal's analysis — not generic fluff.
            </p>

            <div className="mt-6 space-y-3 text-sm text-slate-200">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                <p>Workspace-scoped access (multi-tenant safe)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                <p>Deal scoring, red flags, and structured financials</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                <p>Persisted deal chat (history + decisions)</p>
              </div>
            </div>
          </section>

          {/* Right auth card */}
          <section className="mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Log in to SearchFindr</h2>
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  Secure login
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
                      autoComplete="current-password"
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
                    If you forgot your password, contact support. Access is provided after purchase.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Please wait…' : 'Log in'}
                </button>

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
