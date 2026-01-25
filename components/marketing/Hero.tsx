import Link from 'next/link';
import { ScarcityTracker } from './ScarcityTracker';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Early Bird Badge */}
        <div className="flex justify-center mb-8">
          <ScarcityTracker variant="badge" />
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Stop Reading Bad CIMs.{' '}
            <br className="hidden sm:block" />
            Start Closing Good Deals.
          </h1>
          <p className="text-xl sm:text-2xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed mt-6">
            Identify red flags in 60 seconds. SearchFindr turns messy PDFs into institutional-grade deal memos so you can pass on the 95% of 'garbage' deals instantly.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/50 text-center"
            >
              Start Your Free Trial
            </Link>

            <Link
              href="/sample-analysis"
              className="px-8 py-4 bg-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all border border-white/20 text-center"
            >
              See Sample Analysis
            </Link>
          </div>

          <p className="text-center text-sm text-gray-400 mt-4">
            <span className="font-semibold text-emerald-400">7-day free trial</span> • $0 due today • Cancel anytime with one click
          </p>
          <p className="text-center text-xs text-gray-500 mt-2">
            Self-funded or traditional • Early bird pricing available
          </p>
        </div>
      </div>
    </section>
  );
}
