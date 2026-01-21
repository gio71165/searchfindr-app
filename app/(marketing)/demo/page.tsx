'use client';

import Script from 'next/script';
import { CheckCircle, Target, Zap, TrendingUp } from 'lucide-react';

const CALENDLY_URL = 'https://calendly.com/gio-searchfindr/15min?hide_gdpr_banner=1&primary_color=10b981';

const demoPoints = [
  'Upload a real CIM and watch SearchFindr analyze it in under 2 minutes',
  'See how AI extracts key metrics, flags red flags, and identifies missing information',
  'Review the quality-of-earnings analysis and financial trend insights',
  'Learn how to use the pipeline management features to track multiple deals',
  'See how deal scoring helps you prioritize opportunities',
];

const whoItsFor = [
  {
    icon: Target,
    title: 'Search Fund Operators',
    description: 'Independent searchers actively looking for acquisition opportunities. You need speed and accuracy.',
  },
  {
    icon: Zap,
    title: 'MBA Students',
    description: 'Students pursuing search funds who want to screen deals faster and more systematically.',
  },
  {
    icon: TrendingUp,
    title: 'Independent Sponsors',
    description: 'Operators running your own search process without a large team or enterprise tools.',
  },
];

export default function DemoPage() {
  return (
    <div className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Book a 15-Minute Demo
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            See SearchFindr in action. Watch us analyze a real CIM and show you how it can transform your deal screening process.
          </p>
        </div>

        {/* Who It's For */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Built for searchers who move fast
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {whoItsFor.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all"
                >
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 inline-block mb-4">
                    <Icon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed text-sm">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* What You'll See */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            What you'll see in the demo
          </h2>
          <div className="space-y-4 max-w-2xl mx-auto">
            {demoPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
                <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <p className="text-white/80 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Calendly Embed */}
        <div className="mb-12">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 lg:p-8 overflow-hidden backdrop-blur-sm">
            <div className="mb-4 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Choose a time that works for you</h3>
              <p className="text-white/60 text-sm">15-minute demo • No commitment required</p>
            </div>
            <div className="rounded-xl overflow-hidden bg-white">
              <div
                className="calendly-inline-widget"
                data-url={CALENDLY_URL}
                style={{ minWidth: '320px', height: '700px' }}
              />
            </div>
          </div>
          <Script
            src="https://assets.calendly.com/assets/external/widget.js"
            strategy="lazyOnload"
          />
        </div>

        {/* Pricing Note */}
        <div className="text-center">
          <div className="inline-block p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm">
            <p className="text-white/80">
              <span className="font-semibold text-emerald-300">Early bird pricing:</span>{' '}
              $149/mo locked forever. Only 46 of 50 spots remaining.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
