import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, CheckSquare, Calculator } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Search Fund Blog - Deal Analysis, Checklists, and Guides',
  description: 'Learn how to analyze CIMs, screen deals, and understand SBA financing for search fund acquisitions.',
  keywords: ['search fund blog', 'deal analysis', 'CIM analysis', 'SBA loans', 'M&A guides'],
};

const blogPosts = [
  {
    slug: 'how-to-analyze-a-cim',
    title: 'How to Analyze a CIM: Complete Guide for Search Fund Operators',
    description: 'Learn how to analyze a Confidential Information Memorandum (CIM) like a pro. Red flags, key metrics, and QoE analysis for search fund operators.',
    icon: FileText,
    category: 'Deal Analysis',
  },
  {
    slug: 'search-fund-deal-screening-checklist',
    title: 'Search Fund Deal Screening Checklist',
    description: 'Complete checklist for screening search fund deals. Red flags, green flags, and decision criteria for searchers.',
    icon: CheckSquare,
    category: 'Checklist',
  },
  {
    slug: 'sba-7a-loan-calculator-guide',
    title: 'SBA 7(a) Loan Calculator Guide: 2026 Rules for Search Funds',
    description: 'Complete guide to SBA 7(a) loans for search fund acquisitions. Calculator, eligibility requirements, and 2026 rules explained.',
    icon: Calculator,
    category: 'Financing',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#0b0f17] pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Search Fund Blog
          </h1>
          <p className="text-xl text-white/70">
            Guides, checklists, and resources for search fund operators
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => {
            const Icon = post.icon;
            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="bg-white/5 rounded-lg p-6 border border-white/10 hover:border-emerald-500/50 hover:bg-white/8 transition-all group"
              >
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <div className="mb-2">
                  <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                    {post.category}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                  {post.title}
                </h2>
                <p className="text-white/70 text-sm leading-relaxed">
                  {post.description}
                </p>
                <div className="mt-4 text-emerald-400 text-sm font-semibold group-hover:underline">
                  Read more →
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}
