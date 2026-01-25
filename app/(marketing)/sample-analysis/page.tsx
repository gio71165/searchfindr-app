'use client';

import { GuestCIMUpload } from '@/components/marketing/GuestCIMUpload';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function SampleAnalysisPage() {
  return (
    <div className="pt-20 pb-16 lg:pt-24 lg:pb-20 px-4 sm:px-6 lg:px-8 min-h-screen bg-[#0b0f17]">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            Try SearchFindr in 60 seconds
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-6">
            Upload a CIM and get instant AI analysis with red flags, QoE insights, and actionable recommendations—no signup required.
          </p>
        </div>

        {/* CIM Upload Component */}
        <div className="mb-12">
          <GuestCIMUpload />
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="inline-block p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-3">
              Want full access?
            </h3>
            <p className="text-white/60 mb-5 max-w-xl text-sm">
              Get unlimited CIM analyses, deal management, and team collaboration. Start your 7-day free trial today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-sm font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-white/20 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 transition-all"
              >
                Read Our Blog
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
