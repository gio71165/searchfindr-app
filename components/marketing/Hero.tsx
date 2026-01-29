import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Stop Reading CIMs.{' '}
            <br className="hidden sm:block" />
            Start Auditing Them.
          </h1>
          <p className="text-xl sm:text-2xl text-white/70 mb-10 max-w-3xl mx-auto leading-relaxed mt-6">
            Forensic AI that finds the red flags brokers buried on page 47. Built for search fund operators who've seen too many garbage deals.
          </p>

          {/* CTA - Single primary button */}
          <div className="flex justify-center mt-10 mb-6">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/50 text-center min-h-[56px] flex items-center justify-center"
            >
              Start 7-Day Free Trial
            </Link>
          </div>

          {/* Micro-copy */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-300">
              Full platform access • 7-day free trial • Credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
