import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function VisualDemo() {
  return (
    <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white/5 to-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            See it in action
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Watch how SearchFindr transforms a raw CIM into actionable insights in under 2 minutes.
          </p>
        </div>

        {/* Mockup Container */}
        <div className="relative max-w-5xl mx-auto">
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 rounded-3xl blur-3xl opacity-50" />
          
          {/* Mockup Frame */}
          <div className="relative rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-2 lg:p-4 backdrop-blur-sm">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 mb-4 px-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
              </div>
              <div className="flex-1 h-8 rounded-lg bg-white/5 border border-white/10 px-4 flex items-center">
                <span className="text-xs text-white/40">searchfindr.app/deals/...</span>
              </div>
            </div>

            {/* Content Preview */}
            <div className="rounded-xl bg-[#0a0e14] border border-white/10 p-8 lg:p-12 min-h-[400px] lg:min-h-[500px]">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="h-8 w-48 bg-white/10 rounded-lg mb-3 animate-pulse" />
                    <div className="h-4 w-32 bg-white/5 rounded" />
                  </div>
                  <div className="h-10 w-24 bg-emerald-500/20 rounded-lg border border-emerald-500/30" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-lg border border-white/10 bg-white/5">
                      <div className="h-4 w-20 bg-white/10 rounded mb-2" />
                      <div className="h-8 w-16 bg-emerald-500/20 rounded" />
                    </div>
                  ))}
                </div>

                {/* Content Sections */}
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-6 rounded-lg border border-white/10 bg-white/5">
                      <div className="h-5 w-40 bg-white/10 rounded mb-3" />
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-white/5 rounded" />
                        <div className="h-3 w-5/6 bg-white/5 rounded" />
                        <div className="h-3 w-4/6 bg-white/5 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 group"
          >
            Start 7-Day Free Trial
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
