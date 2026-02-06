import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Know if a deal is garbage
            <br className="hidden sm:block" />
            <span className="text-emerald-400">in 60 seconds</span>
          </h1>
          <p className="text-xl sm:text-2xl text-white/70 mb-10 max-w-3xl mx-auto leading-relaxed mt-6">
            Your AI analyst that reads CIMs so you don't have to. Built for searchers who waste 200+ hours on deals that should've been obvious passes.
          </p>

          {/* CTA - Single primary button */}
          <div className="flex justify-center mt-10 mb-6">
            <Link
              href="/signup"
              className="btn-primary btn-lg px-8 rounded-xl font-bold text-center min-h-[56px] flex items-center justify-center shadow-lg hover:shadow-emerald-500/50"
            >
              Try It Free
            </Link>
          </div>

          {/* Micro-copy */}
          <div className="text-center mt-6">
            <p className="text-sm text-slate-300">
              Full platform access • 7-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
