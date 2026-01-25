import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calculator, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'SBA 7(a) Loan Calculator Guide: 2026 Rules for Search Funds',
  description: 'Complete guide to SBA 7(a) loans for search fund acquisitions. Calculator, eligibility requirements, and 2026 rules explained.',
  keywords: ['SBA 7(a) loan', 'SBA calculator', 'search fund financing', 'SBA 2026 rules', 'business acquisition loan'],
};

export default function SBACalculatorGuidePage() {
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
            SBA 7(a) Loan Calculator Guide: 2026 Rules for Search Funds
          </h1>
          <p className="text-xl text-white/70">
            Everything you need to know about SBA 7(a) financing for search fund acquisitions, including 2026 rule changes.
          </p>
        </div>

        {/* Content */}
        <article className="prose prose-invert max-w-none">
          <div className="text-white/80 space-y-8 leading-relaxed">
            <p className="text-lg">
              Most search fund acquisitions use SBA 7(a) loans for 70-80% of the purchase price. 
              Understanding the 2026 rules and calculating eligibility upfront saves months of wasted time on deals that can't be financed.
            </p>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">SBA 7(a) Loan Basics (2026 Rules)</h2>
            
            <div className="bg-white/5 rounded-lg p-6 border border-white/10 my-6">
              <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Key Loan Terms
              </h3>
              <ul className="space-y-2">
                <li><strong>Maximum loan amount:</strong> $5,000,000</li>
                <li><strong>SBA guarantee:</strong> 85% up to $150K, 75% above $150K</li>
                <li><strong>Guarantee fee:</strong> 2-3.75% based on loan size</li>
                <li><strong>Guarantee fee waiver:</strong> Manufacturing (NAICS 31-33) up to $950K until Sept 30, 2026</li>
                <li><strong>Interest rates:</strong> Prime + 2.25-2.75% (typically 8-10% in 2026)</li>
                <li><strong>Term:</strong> Up to 10 years for working capital, 25 years for real estate</li>
              </ul>
            </div>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">Eligibility Requirements (2026 Rules)</h2>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 my-6">
              <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Must-Have Requirements
              </h3>
              <ul className="space-y-3">
                <li><strong>DSCR (Debt Service Coverage Ratio):</strong> Minimum 1.15x, lenders prefer 1.25x+</li>
                <li><strong>Equity injection:</strong> Minimum 10%, lenders prefer 15%+ for deals &gt;$1M</li>
                <li><strong>Customer concentration:</strong> &lt;50% from single customer (deal killer if exceeded)</li>
                <li><strong>Passive income:</strong> &lt;50% of revenue from passive sources</li>
                <li><strong>Real estate:</strong> &lt;51% of loan proceeds for real estate</li>
                <li><strong>US ownership:</strong> 100% US citizens or permanent residents</li>
                <li><strong>Business size:</strong> Net worth &lt;$15M, net income &lt;$5M (after-tax) averaged over 2 years</li>
              </ul>
            </div>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">How to Calculate DSCR</h2>
            <p>
              Debt Service Coverage Ratio (DSCR) is the most critical metric. Here's how to calculate it:
            </p>
            
            <div className="bg-white/5 rounded-lg p-6 border border-white/10 my-6">
              <h3 className="text-lg font-bold text-white mb-4">DSCR Formula:</h3>
              <div className="text-2xl font-bold text-emerald-400 mb-4 text-center">
                DSCR = Normalized EBITDA ÷ Annual Debt Service
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">Step 1: Calculate Normalized EBITDA</h4>
                  <ul className="list-disc pl-6 space-y-1 text-white/80">
                    <li>Start with reported EBITDA</li>
                    <li>Add back owner salary (at market rate: $150-250K for $2-5M revenue)</li>
                    <li>Add back one-time expenses (verify they're truly one-time)</li>
                    <li>Subtract one-time revenue (asset sales, settlements)</li>
                    <li>Adjust for customer concentration risk if &gt;20%</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Step 2: Calculate Annual Debt Service</h4>
                  <ul className="list-disc pl-6 space-y-1 text-white/80">
                    <li>Principal + Interest payments for the year</li>
                    <li>For SBA 7(a): Typically 8-10% interest rate</li>
                    <li>10-year term for working capital, 25 years for real estate</li>
                    <li>Use an amortization calculator or SBA loan calculator</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Step 3: Calculate DSCR</h4>
                  <p className="text-white/80">
                    Divide normalized EBITDA by annual debt service. Result should be &gt;1.25x for best approval odds.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">Example Calculation</h2>
            <div className="bg-white/5 rounded-lg p-6 border border-white/10 my-6">
              <p className="mb-4"><strong>Scenario:</strong> $3M purchase price, $600K normalized EBITDA</p>
              <ul className="space-y-2">
                <li>Loan amount: $2.4M (80% of purchase price)</li>
                <li>Interest rate: 9% (Prime + 2.5%)</li>
                <li>Term: 10 years</li>
                <li>Annual debt service: ~$380K</li>
                <li><strong>DSCR: $600K ÷ $380K = 1.58x ✅ (Meets requirement)</strong></li>
              </ul>
            </div>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">Common Deal Killers</h2>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 my-6">
              <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Automatic Rejection Reasons
              </h3>
              <ul className="space-y-2">
                <li>Customer concentration &gt;50% from single customer</li>
                <li>DSCR &lt;1.15x (can't support debt service)</li>
                <li>Normalized EBITDA &lt;$200K (too small to support debt)</li>
                <li>Passive income &gt;50% of revenue</li>
                <li>Real estate &gt;51% of loan proceeds</li>
                <li>Non-US ownership</li>
                <li>Business size exceeds SBA limits</li>
              </ul>
            </div>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">2026 Rule Changes</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Manufacturing fee waiver:</strong> Extended until Sept 30, 2026 for NAICS 31-33 up to $950K</li>
              <li><strong>DSCR requirements:</strong> Still 1.15x minimum, but lenders increasingly prefer 1.25x+</li>
              <li><strong>Equity requirements:</strong> 15%+ preferred for deals &gt;$1M (up from 10% minimum)</li>
              <li><strong>Processing times:</strong> Vary by lender, typically 60-90 days</li>
            </ul>

            <h2 className="text-3xl font-bold text-white mt-12 mb-6">Tips for Search Fund Operators</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong>Calculate DSCR early:</strong> Don't waste months on deals that can't be financed</li>
              <li><strong>Use normalized EBITDA:</strong> Not reported EBITDA - adjust for QoE issues</li>
              <li><strong>Verify customer concentration:</strong> Get top 10 customer list before IOI</li>
              <li><strong>Build relationships:</strong> Work with SBA-preferred lenders who understand search funds</li>
              <li><strong>Plan for guarantee fee:</strong> Factor 2-3.75% into your total acquisition cost</li>
            </ul>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 my-8">
              <h3 className="text-xl font-bold text-emerald-400 mb-3 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Use Our Free SBA Calculator
              </h3>
              <p className="mb-4 text-white/80">
                SearchFindr includes a free SBA 7(a) loan calculator that automatically calculates DSCR, 
                eligibility, and loan terms based on 2026 rules. No signup required.
              </p>
              <Link
                href="/tools/sba-calculator"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors"
              >
                Try Free SBA Calculator
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
