'use client';

import { X, Check, Clock, FileText, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

const oldWayItems = [
  {
    icon: Clock,
    text: '4 hours of reading per CIM',
    color: 'text-red-400',
  },
  {
    icon: FileText,
    text: 'Manual Excel entry for financials',
    color: 'text-red-400',
  },
  {
    icon: AlertTriangle,
    text: 'Missed red flags on page 42',
    color: 'text-red-400',
  },
  {
    icon: X,
    text: 'No clear verdict—just gut feeling',
    color: 'text-red-400',
  },
];

const newWayItems = [
  {
    icon: Zap,
    text: '60-second upload',
    color: 'text-emerald-400',
  },
  {
    icon: TrendingUp,
    text: 'Auto-extracted financials',
    color: 'text-emerald-400',
  },
  {
    icon: Check,
    text: 'Instant Proceed/Pass verdict',
    color: 'text-emerald-400',
  },
  {
    icon: FileText,
    text: 'Investor-ready memos in 1-click',
    color: 'text-emerald-400',
  },
];

export function OldWayVsNewWay() {
  return (
    <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white/5 to-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            The Old Way vs.{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              The SearchFindr Way
            </span>
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Stop wasting time on deals that don't deserve it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Old Way */}
          <div className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="px-4 py-1.5 bg-red-500/20 border border-red-500/30 text-red-300 rounded-full text-sm font-semibold backdrop-blur-sm">
                The Old Way
              </span>
            </div>
            <div className="pt-8 pb-8 px-8 rounded-2xl border-2 border-red-500/30 bg-gradient-to-br from-red-900/20 to-slate-900/40 backdrop-blur-sm">
              <div className="space-y-4">
                {oldWayItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-red-500/10"
                    >
                      <div className={`flex-shrink-0 mt-0.5 ${item.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-white/90 text-base leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-6 border-t border-red-500/20">
                <p className="text-center text-red-300 font-semibold text-lg">
                  Result: 88 hours wasted per quarter
                </p>
              </div>
            </div>
          </div>

          {/* SearchFindr Way */}
          <div className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-sm font-semibold backdrop-blur-sm">
                The SearchFindr Way
              </span>
            </div>
            <div className="pt-8 pb-8 px-8 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-slate-900/40 backdrop-blur-sm shadow-lg shadow-emerald-500/10">
              <div className="space-y-4">
                {newWayItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-emerald-500/20"
                    >
                      <div className={`flex-shrink-0 mt-0.5 ${item.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-white/90 text-base leading-relaxed font-medium">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-6 border-t border-emerald-500/20">
                <p className="text-center text-emerald-300 font-semibold text-lg">
                  Result: Close deals 10x faster
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
