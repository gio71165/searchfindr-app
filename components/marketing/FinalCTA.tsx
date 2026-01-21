import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/dRm4gz1ReaTxct01lKawo00';

export function FinalCTA() {
  return (
    <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-white/5">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
          Start screening deals faster
        </h2>
        <p className="text-xl text-white/60 mb-8">
          30-day money-back guarantee. No credit card required to start.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <a
            href={STRIPE_PAYMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105 flex items-center justify-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5" />
          </a>
          <Link
            href="/demo"
            className="w-full sm:w-auto px-8 py-4 rounded-lg border-2 border-white/20 bg-white/5 text-base font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all"
          >
            Book Demo
          </Link>
        </div>

        <p className="text-sm text-white/50">
          Questions? <Link href="/demo" className="text-emerald-400 hover:text-emerald-300 underline">Schedule a call</Link> or email support.
        </p>
      </div>
    </section>
  );
}
