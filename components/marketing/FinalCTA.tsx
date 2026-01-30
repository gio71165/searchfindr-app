import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function FinalCTA() {
  return (
    <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-white/5">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
          Ready to stop wasting time on garbage deals?
        </h2>
        <p className="text-xl text-white/60 mb-8">
          30-day money-back guarantee.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105 flex items-center justify-center gap-2"
          >
            Start Your Free Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
        <p className="text-sm text-white/50">
          Questions? <Link href="/demo" className="text-emerald-400 hover:text-emerald-300 underline">Book a 15-minute call</Link>
        </p>

        <p className="text-sm text-slate-400 mb-4">
          <span className="font-semibold text-emerald-400">7-day free trial</span> • Credit card required • Cancel anytime with one click
        </p>

        <p className="text-sm text-white/50">
          Questions? <Link href="/demo" className="text-emerald-400 hover:text-emerald-300 underline">Schedule a call</Link> or email support.
        </p>
      </div>
    </section>
  );
}
