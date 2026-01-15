'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600 mb-8">Settings page coming soon.</p>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h2 className="font-semibold text-slate-900 mb-1">Future Settings</h2>
              <p className="text-sm text-slate-600">
                This page will include preferences, extension connection, notification settings, and more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
