import { Rocket } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Early Bird Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 backdrop-blur-sm">
            <Rocket className="h-4 w-4 animate-pulse" />
            <span><strong>21/50 spots filled</strong> · Early bird ends Feb 28, 2026</span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Review deals 10x faster.{' '}
            <br className="hidden sm:block" />
            Catch red flags that would cost you 6 months of wasted diligence.
          </h1>
          <p className="text-xl sm:text-2xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed mt-6">
            Upload a CIM. Get AI analysis in 60 seconds. Know exactly 
            which deals deserve your time—and which ones to pass.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link
              href="/demo"
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105"
            >
              Book Demo
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-8 py-4 rounded-lg border-2 border-white/20 bg-white/5 text-base font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all backdrop-blur-sm"
            >
              See Pricing
            </Link>
            <Link
              href="/sample-analysis"
              className="w-full sm:w-auto px-8 py-4 rounded-lg border-2 border-white/10 bg-white/3 text-base font-semibold text-white/80 hover:bg-white/5 hover:border-white/20 transition-all backdrop-blur-sm"
            >
              See Sample Analysis
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
