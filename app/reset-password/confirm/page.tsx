'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { showToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { CheckCircle, XCircle } from 'lucide-react';

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have the hash from the email link
    const hash = window.location.hash;
    if (!hash) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      showToast('Password reset successfully!', 'success');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="bg-white/[0.06] rounded-2xl border border-white/10 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Password reset successful!</h2>
            <p className="text-slate-300 mb-6">
              Your password has been updated. Redirecting to login...
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 transition-colors"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error && !password) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="bg-white/[0.06] rounded-2xl border border-white/10 p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Invalid reset link</h2>
            <p className="text-slate-300 mb-6">{error}</p>
            <Link
              href="/reset-password"
              className="inline-block px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 transition-colors"
            >
              Request new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100">
      {/* Subtle background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-14">
        <div className="w-full">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur">
            <h2 className="text-xl font-semibold mb-2">Set new password</h2>
            <p className="text-sm text-slate-400 mb-6">
              Enter your new password below.
            </p>

            {error && (
              <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
                <p className="mt-1 text-xs text-slate-400">Must be at least 8 characters</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
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
                loadingText="Resetting..."
                className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400"
              >
                Reset password
              </AsyncButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
