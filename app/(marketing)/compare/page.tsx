import { Check, X } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/dRm4gz1ReaTxct01lKawo00';

const comparisonData = [
  {
    feature: 'Built for',
    searchfindr: 'Search fund operators',
    dealsage: 'PE firms',
  },
  {
    feature: 'Pricing',
    searchfindr: '$149/mo self-serve',
    dealsage: 'Enterprise (contact sales)',
  },
  {
    feature: 'Setup',
    searchfindr: '5 minutes',
    dealsage: 'Demo required',
  },
  {
    feature: 'Deal sourcing',
    searchfindr: 'Active (extension + aggregation)',
    dealsage: 'Passive (upload only)',
  },
  {
    feature: 'Pipeline',
    searchfindr: 'Full workflow',
    dealsage: 'Repository only',
  },
  {
    feature: 'Best for',
    searchfindr: 'Active searchers',
    dealsage: 'Enterprise teams',
  },
];

export default function ComparePage() {
  return (
    <div className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            SearchFindr vs DealSage
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Built for searchers, not PE firms
          </p>
        </div>

        {/* Comparison Table */}
        <div className="mb-16">
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-400">SearchFindr</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white/60">DealSage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {comparisonData.map((row, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm font-medium text-white/80">{row.feature}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Check className="h-5 w-5 text-emerald-400" />
                          <span className="text-sm text-emerald-300 font-medium">{row.searchfindr}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-white/60">{row.dealsage}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="mb-12">
          <div className="p-8 lg:p-12 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 backdrop-blur-sm">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4 text-center">
              The Bottom Line
            </h2>
            <p className="text-lg text-white/80 text-center leading-relaxed max-w-3xl mx-auto">
              <span className="font-semibold text-emerald-300">SearchFindr is for searchers finding their business.</span>{' '}
              We built it specifically for independent operators who need speed, affordability, and active deal sourcing.
              DealSage is for PE firms analyzing deal flow—powerful, but built for a different use case.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={STRIPE_PAYMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105 flex items-center justify-center gap-2"
          >
            Lock in $149/mo Forever
            <ArrowRight className="h-5 w-5" />
          </a>
          <Link
            href="/demo"
            className="w-full sm:w-auto px-8 py-4 rounded-lg border-2 border-white/20 bg-white/5 text-base font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all"
          >
            Book Demo
          </Link>
        </div>
      </div>
    </div>
  );
}
