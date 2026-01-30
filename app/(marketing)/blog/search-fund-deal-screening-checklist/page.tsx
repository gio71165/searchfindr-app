import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckSquare, X, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Search Fund Deal Screening Checklist: What to Look For',
  description: 'Complete checklist for screening search fund deals. Red flags, green flags, and decision criteria for searchers.',
  keywords: ['search fund', 'deal screening', 'checklist', 'M&A screening', 'search fund criteria'],
};

export default function DealScreeningChecklistPage() {
  return (
    <div className="min-h-screen bg-[#0b0f17] pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/blog"
          className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Search Fund Deal Screening Checklist
          </h1>
          <p className="text-xl text-white/70">
            Use this checklist to quickly evaluate deals and avoid wasting time on the 95% that don't fit.
          </p>
        </div>

        {/* Content */}
        <article className="prose prose-invert max-w-none">
          <div className="text-white/80 space-y-8 leading-relaxed">
            <p className="text-lg">
              Most search fund operators review 50-100 deals before finding one worth pursuing. 
              This checklist helps you screen deals in under 60 minutes and make a PROCEED/PARK/PASS decision.
            </p>

            {/* Deal Size & Economics */}
            <section className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckSquare className="w-6 h-6 text-emerald-400" />
                1. Deal Size & Economics
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>EBITDA in $2-10M range (search fund sweet spot)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Asking price multiple: 3-5x normalized EBITDA</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Purchase price: $5-30M (typical search fund range)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Normalized EBITDA &gt;$200K (supports SBA debt service)</span>
                </div>
              </div>
            </section>

            {/* Quality of Earnings */}
            <section className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckSquare className="w-6 h-6 text-emerald-400" />
                2. Quality of Earnings (QoE)
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-emerald-400 mb-2">Green Flags:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                      <span>Customer concentration &lt;20% from top customer</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                      <span>Stable or growing revenue (3-5 year trend)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                      <span>EBITDA margin &gt;15%</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                      <span>Conservative addbacks (owner salary at market rate)</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <X className="w-5 h-5" />
                    Red Flags:
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-1" />
                      <span>Customer concentration &gt;50% (SBA ineligible)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-1" />
                      <span>Revenue declining &gt;20% per year</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-1" />
                      <span>Aggressive addbacks (&gt;$300K owner salary)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-1" />
                      <span>One-time revenue items (asset sales, settlements)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-1" />
                      <span>Negative or deteriorating working capital</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* SBA Eligibility */}
            <section className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckSquare className="w-6 h-6 text-emerald-400" />
                3. SBA 7(a) Eligibility (2026 Rules)
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Deal size &lt;$5M loan required</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>DSCR &gt;1.25x (normalized EBITDA / debt service)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Customer concentration &lt;50% from single customer</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Passive income &lt;50% of revenue</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>US ownership (100% US citizens/permanent residents)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Equity &gt;15% (lenders prefer for deals &gt;$1M)</span>
                </div>
              </div>
            </section>

            {/* Business Model */}
            <section className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckSquare className="w-6 h-6 text-emerald-400" />
                4. Business Model Fit
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Recurring revenue (maintenance contracts, subscriptions, retainers)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Low owner dependency (can run without owner)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Scalable (can add locations, customers, services)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Sticky customers (high switching costs, long contracts)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Market leader or niche player (not commodity)</span>
                </div>
              </div>
            </section>

            {/* Owner & Transition */}
            <section className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckSquare className="w-6 h-6 text-emerald-400" />
                5. Owner & Transition Risk
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Owner willing to stay 6-12 months for transition</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Clear succession motivation (retirement, health, other interests)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Management depth (can business run without owner?)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Documented processes and systems</span>
                </div>
              </div>
            </section>

            {/* Decision Framework */}
            <section className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 my-8">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Decision Framework
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">✅ PROCEED</h3>
                  <p className="text-white/80">
                    Submit IOI if deal passes QoE, SBA eligibility, business model fit, and owner transition looks manageable.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">⏸️ PARK</h3>
                  <p className="text-white/80">
                    Interesting but need more info: financials, customer list, management depth, or owner commitment.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-2">❌ PASS</h3>
                  <p className="text-white/80">
                    Too many red flags, wrong size, SBA ineligible, or not search fund-friendly. Move on quickly.
                  </p>
                </div>
              </div>
            </section>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 my-8">
              <h3 className="text-xl font-bold text-emerald-400 mb-3">Automate Your Deal Screening</h3>
              <p className="mb-4 text-white/80">
                SearchFindr analyzes CIMs in 60 seconds using this exact checklist. Get instant PROCEED/PARK/PASS recommendations 
                with QoE red flags, SBA eligibility, and search fund fit analysis.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors"
              >
                Start Your Free Trial
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
