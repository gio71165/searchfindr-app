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
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/50 text-center"
            >
              Start at $49/Month
            </Link>

            <Link
              href="/sample-analysis"
              className="px-8 py-4 bg-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all border border-white/20 text-center"
            >
              See Sample Analysis
            </Link>
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            Self-funded or traditional • Early bird pricing available
          </p>
        </div>
      </div>
    </section>
  );
}
