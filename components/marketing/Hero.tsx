import { Rocket } from 'lucide-react';
import Link from 'next/link';

const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/dRm4gz1ReaTxct01lKawo00';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Early Bird Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 backdrop-blur-sm">
            <Rocket className="h-4 w-4" />
            <span>$149/mo locked forever - 46 of 50 spots left</span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Find better deals{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              faster
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            AI-powered deal screening for search fund operators. Turn raw deal inputs into standardized screening output in minutes, not weeks.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={STRIPE_PAYMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105"
            >
              Start Free Trial
            </a>
            <Link
              href="/demo"
              className="w-full sm:w-auto px-8 py-4 rounded-lg border-2 border-white/20 bg-white/5 text-base font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all backdrop-blur-sm"
            >
              Book Demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
