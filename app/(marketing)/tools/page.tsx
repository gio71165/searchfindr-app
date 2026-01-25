import { Metadata } from 'next';
import Link from 'next/link';
import { Calculator, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Free Tools for Search Fund Operators | SearchFindr',
  description: 'Free tools for search fund operators including SBA 7(a) loan calculator, deal analysis, and more.',
  keywords: ['search fund tools', 'SBA calculator', 'deal analysis tools', 'M&A calculator'],
};

const tools = [
  {
    slug: 'sba-calculator',
    title: 'SBA 7(a) Loan Calculator',
    description: 'Calculate DSCR, loan eligibility, and financing scenarios for SBA 7(a) loans. Perfect for search fund acquisitions.',
    icon: Calculator,
    category: 'Financing',
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#0b0f17] pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Free Tools for Search Fund Operators
          </h1>
          <p className="text-xl text-white/70">
            Calculators and tools to help you analyze deals and structure financing
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="bg-white/5 rounded-lg p-6 border border-white/10 hover:border-emerald-500/50 hover:bg-white/8 transition-all group"
              >
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <div className="mb-2">
                  <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                    {tool.category}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                  {tool.title}
                </h2>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  {tool.description}
                </p>
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold group-hover:underline">
                  Use Tool
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Want More Tools?</h3>
          <p className="text-white/80 mb-6">
            Get access to unlimited CIM analyses, deal management, pipeline tracking, and more with SearchFindr.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sample-analysis"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 bg-white/5 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Try It Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
