import Link from 'next/link';
import { FileSearch, BarChart3, Zap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Mission | SearchFindr',
  description: 'Why we built SearchFindr: From a single spreadsheet to a searcher\'s essential tool.',
};

const roadmapItems = [
  {
    icon: FileSearch,
    title: 'Better Extraction',
    description: 'More accurate data extraction from complex documents and financial statements.',
  },
  {
    icon: BarChart3,
    title: 'Deeper Analysis',
    description: 'Advanced AI models that understand deal nuances and industry-specific risks.',
  },
  {
    icon: Zap,
    title: 'Faster Sourcing',
    description: 'Automated deal discovery and intelligent matching to your search criteria.',
  },
];

export default function MissionPage() {
  return (
    <article className="min-h-screen py-20 lg:py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            The Mission
          </h1>
          <p className="text-xl text-white/60 font-light">
            Why we built SearchFindr
          </p>
        </header>

        {/* Main Content - Typography Focused */}
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="space-y-8 text-white/90 leading-relaxed">
            {/* Opening */}
            <p className="text-2xl sm:text-3xl font-light text-white/80 leading-relaxed border-l-4 border-emerald-500 pl-6 mb-8">
              From a single spreadsheet to a searcher's essential tool.
            </p>

            {/* First Paragraph */}
            <p className="text-lg sm:text-xl leading-relaxed">
              I didn't start SearchFindr because I wanted to buy a business. I started it because I watched a friend—a talented, driven searcher—slowly drowning in PDFs.
            </p>

            {/* Second Paragraph */}
            <p className="text-lg sm:text-xl leading-relaxed">
              He was spending <strong className="text-white font-semibold">60+ hours a month</strong> reading CIMs (Confidential Information Memorandums). Most of those deals were dead on arrival, but he wouldn't know that until he reached page 45. As a finance student, I knew there was a more efficient way to "crack the code" of a deal. I built him a tool to automate the boring stuff so he could focus on the closing stuff.
            </p>

            {/* Third Paragraph */}
            <p className="text-lg sm:text-xl leading-relaxed">
              It worked. What started as a solution for one person grew through hundreds of hours of research into the Search community. I realized that the <strong className="text-white font-semibold">"Searcher's Grind"</strong> wasn't a rite of passage—it was an inefficiency.
            </p>

            {/* Philosophy Section */}
            <div className="mt-16 pt-12 border-t border-white/10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                The SearchFindr Philosophy
              </h2>
              <p className="text-lg sm:text-xl leading-relaxed mb-4">
                I am a serial entrepreneur obsessed with one thing: <strong className="text-white font-semibold">Time</strong>. In the M&A world, time is your only non-renewable resource. Searchers are competing with private equity firms and other buyers. If it takes you three days to vet a deal that your competitor vetted in three minutes, you've already lost.
              </p>
              <p className="text-lg sm:text-xl leading-relaxed">
                SearchFindr is here to ensure you never lose on speed. We've built the <strong className="text-white font-semibold">"AI Associate"</strong> I wish my friend had from day one.
              </p>
            </div>
          </div>
        </div>

        {/* The Roadmap Section */}
        <section className="mt-24 pt-16 border-t border-white/10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-12 text-center">
            The Roadmap
          </h2>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {roadmapItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                    <Icon className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-24 pt-16 border-t border-white/10">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to stop grinding and start searching?
            </h2>
            <Link
              href="/signup"
              className="btn-primary btn-lg inline-flex items-center gap-2 px-8 rounded-xl shadow-lg hover:shadow-emerald-500/50 hover:scale-105"
            >
              Start Your Free Trial
            </Link>
            <p className="text-sm text-white/50 mt-4">
              7-day free trial • $0 due today • Cancel anytime
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}
