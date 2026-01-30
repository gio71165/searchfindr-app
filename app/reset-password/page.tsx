'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { showToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/confirm`,
      });

      if (error) throw error;

      setEmailSent(true);
      showToast('Password reset email sent! Check your inbox.', 'success');
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Something went wrong';
      showToast(error, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="bg-white/[0.06] rounded-2xl border border-white/10 p-8 text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Check your email</h2>
            <p className="text-slate-300 mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-slate-400 mb-6">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="w-full px-4 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Send another email
              </button>
              <Link
                href="/login"
                className="block w-full px-4 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                Back to login
              </Link>
            </div>
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
        <div className="absolute -bottom-32 left-1/3 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-14">
        <div className="w-full">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur">
            <h2 className="text-xl font-semibold mb-2">Reset your password</h2>
            <p className="text-sm text-slate-400 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <AsyncButton
                type="submit"
                isLoading={loading}
                loadingText="Sending..."
                className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400"
              >
                Send reset link
              </AsyncButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
