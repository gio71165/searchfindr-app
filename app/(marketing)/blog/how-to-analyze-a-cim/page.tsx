import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle, AlertTriangle, Calculator } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How to Analyze a CIM: Complete Guide for Search Fund Operators',
  description: 'Learn how to analyze a Confidential Information Memorandum (CIM) like a pro. Red flags, key metrics, and QoE analysis for search fund operators.',
  keywords: ['CIM analysis', 'confidential information memorandum', 'deal analysis', 'search fund', 'M&A analysis'],
};

export default function HowToAnalyzeCIMPage() {
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
            How to Analyze a CIM: Complete Guide for Search Fund Operators
          </h1>
          <p className="text-xl text-white/70">
            Learn the red flags, key metrics, and quality-of-earnings analysis that matter for search fund deals.
          </p>
          <div className="mt-4 text-sm text-white/50">
            Published: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Content */}
        <article className="prose prose-invert max-w-none">
          <div className="text-white/80 space-y-6 leading-relaxed">
            <p className="text-lg">
              Analyzing a Confidential Information Memorandum (CIM) is one of the most critical skills for search fund operators. 
              You'll review dozens of deals, and most will be garbage. Here's how to identify the 5% worth pursuing in under 60 minutes.
            </p>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">1. Start with the Executive Summary</h2>
            <p>
              The executive summary tells you 80% of what you need to know. Look for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Deal size:</strong> Is it in your sweet spot ($2-10M EBITDA)?</li>
              <li><strong>Asking price multiple:</strong> 3-5x normalized EBITDA is typical for search funds</li>
              <li><strong>Owner motivation:</strong> Retirement, succession planning, or distress?</li>
              <li><strong>Business model:</strong> Recurring revenue, sticky customers, or project-based?</li>
            </ul>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">2. Quality of Earnings (QoE) Red Flags</h2>
            <p>
              This is where most searchers get burned. Look for these red flags:
            </p>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 my-6">
              <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Critical QoE Red Flags
              </h3>
              <ul className="space-y-3">
                <li><strong>Customer concentration:</strong> &gt;20% from single customer is risky. &gt;50% makes SBA financing impossible.</li>
                <li><strong>Revenue volatility:</strong> Year-over-year spikes or drops &gt;20% need explanation</li>
                <li><strong>Aggressive addbacks:</strong> Owner salary addbacks &gt;$300K are suspicious. Market rate is $150-250K for $2-5M revenue businesses.</li>
                <li><strong>One-time revenue:</strong> Asset sales, legal settlements, insurance claims should be excluded</li>
                <li><strong>Working capital issues:</strong> Increasing AR days, inventory buildup, negative working capital</li>
                <li><strong>Related party transactions:</strong> Rent, services, or sales to owner/family entities at non-market rates</li>
              </ul>
            </div>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">3. Financial Analysis Checklist</h2>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 my-6">
              <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Financial Metrics to Verify
              </h3>
              <ul className="space-y-3">
                <li><strong>EBITDA margin:</strong> &gt;15% is good, &lt;10% is risky for SBA financing</li>
                <li><strong>Revenue trends:</strong> 3-5 years of financials showing growth or stability</li>
                <li><strong>Normalized EBITDA:</strong> After QoE adjustments, can it support debt service?</li>
                <li><strong>DSCR calculation:</strong> Normalized EBITDA / Annual Debt Service should be &gt;1.25x for SBA</li>
                <li><strong>Working capital:</strong> Positive and stable or improving trend</li>
                <li><strong>Debt levels:</strong> Existing debt that needs to be paid off at closing</li>
              </ul>
            </div>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">4. SBA 7(a) Eligibility Assessment</h2>
            <p>
              Most search fund deals use SBA 7(a) financing. Verify eligibility early:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Max loan:</strong> $5M (2026 rules)</li>
              <li><strong>Customer concentration:</strong> &lt;50% from single customer required</li>
              <li><strong>DSCR:</strong> Minimum 1.15x, lenders prefer 1.25x+</li>
              <li><strong>Equity:</strong> Minimum 10%, lenders prefer 15%+ for deals &gt;$1M</li>
              <li><strong>Passive income:</strong> &lt;50% of revenue from passive sources</li>
              <li><strong>US ownership:</strong> 100% US citizens or permanent residents</li>
            </ul>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">5. Business Model Analysis</h2>
            <p>
              Look for search fund-friendly characteristics:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Recurring revenue:</strong> Maintenance contracts, subscriptions, retainer clients</li>
              <li><strong>Customer stickiness:</strong> High switching costs, long-term contracts</li>
              <li><strong>Owner dependency:</strong> Can the business run without the owner? Key person risk?</li>
              <li><strong>Scalability:</strong> Can you add locations, customers, or services?</li>
              <li><strong>Market position:</strong> Local leader, niche player, or commodity?</li>
            </ul>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">6. Red Flags That Kill Deals</h2>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 my-6">
              <ul className="space-y-3">
                <li>Customer concentration &gt;50% (SBA ineligible)</li>
                <li>Normalized EBITDA &lt;$200K (can't support debt service)</li>
                <li>Revenue declining &gt;20% per year (structural issues)</li>
                <li>Negative working capital and deteriorating</li>
                <li>Owner unwilling to stay 6-12 months for transition</li>
                <li>Regulatory issues, lawsuits, or environmental concerns</li>
                <li>Asking price &gt;5x normalized EBITDA (overpriced)</li>
              </ul>
            </div>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">7. Your Analysis Framework</h2>
            <p>
              Use this decision framework for every CIM:
            </p>
            <ol className="list-decimal pl-6 space-y-3">
              <li><strong>PROCEED:</strong> Submit IOI if deal passes QoE, SBA eligibility, and fits your criteria</li>
              <li><strong>PARK:</strong> Interesting but need more info (financials, customer list, management depth)</li>
              <li><strong>PASS:</strong> Too many red flags, wrong size, or not search fund-friendly</li>
            </ol>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">8. Speed Matters</h2>
            <p>
              The best searchers can analyze a CIM in 30-60 minutes and make a PROCEED/PARK/PASS decision. 
              Don't waste weeks on deals that don't fit. Use tools like SearchFindr to automate the initial screening 
              and focus your time on the deals that matter.
            </p>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 my-8">
              <h3 className="text-xl font-bold text-emerald-400 mb-3">Want to Analyze CIMs Faster?</h3>
              <p className="mb-4">
                SearchFindr analyzes CIMs in 60 seconds, flagging QoE red flags, SBA eligibility, and search fund fit. 
                Get institutional-grade deal memos without the manual work.
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
