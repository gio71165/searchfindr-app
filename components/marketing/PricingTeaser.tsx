import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ScarcityTracker } from './ScarcityTracker';

export function PricingTeaser() {
  return (
    <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Early bird pricing
          </h2>
          <p className="text-xl text-white/60">
            Lock in your rate before public launch
          </p>
        </div>

        <div className="relative">
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-cyan-500/20 to-emerald-500/30 rounded-3xl blur-2xl opacity-50" />
          
          {/* Pricing Card */}
          <div className="relative p-8 lg:p-12 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 backdrop-blur-sm">
            <div className="text-center">
              <div className="mb-6">
                <ScarcityTracker variant="badge" />
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl lg:text-6xl font-bold text-white">$79</span>
                  <span className="text-xl text-white/60">/month</span>
                </div>
                <p className="text-lg text-emerald-300 font-medium mt-2">
                  Locked forever
                </p>
                <p className="text-sm text-white/60 mt-2">
                  After early bird: $149/mo
                </p>
              </div>

              <div className="space-y-4 mb-8 text-left max-w-md mx-auto">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/80">20 CIM analyses per month</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/80">10 Financial models per month</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/80">All features included</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/80">30-day money-back guarantee</span>
                </div>
                <div className="pt-3 border-t border-emerald-500/20 mt-3">
                  <p className="text-xs text-emerald-300/80 mb-2 font-semibold uppercase tracking-wider">Early Bird Exclusives</p>
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-white/90 font-medium">Influence in the software</span>
                  </div>
                  <div className="flex items-start gap-3 mt-2">
                    <div className="h-5 w-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-white/90 font-medium">Founder direct access</span>
                  </div>
                  <div className="flex items-start gap-3 mt-2">
                    <div className="h-5 w-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-white/90 font-medium">Beta feature access</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105 flex items-center justify-center gap-2"
                >
                  Start Your Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
              <p className="text-center text-sm text-slate-400 mt-4">
                <span className="font-semibold text-emerald-400">7-day free trial</span> • Credit card required • Cancel anytime with one click
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
