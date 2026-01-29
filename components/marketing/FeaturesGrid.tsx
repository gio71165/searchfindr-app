import {
  FileText,
  TrendingUp,
  LayoutDashboard,
  GitCompare,
  Chrome,
  Search,
  Download,
  MessageSquare,
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Know in 2 minutes what would take you 2 hours to find on page 30',
    description: 'AI reads the entire CIM, extracts financials, identifies red flags, and gives you a clear Proceed/Park/Pass recommendation.',
  },
  {
    icon: LayoutDashboard,
    title: 'Your Search OS',
    description: 'Automatic reminders, stage-based playbooks, and broker feedback generation keep you organized and professional. Never miss a follow-up. Never lose a deal.',
  },
  {
    icon: TrendingUp,
    title: 'Instantly Check Bankability',
    description: 'Full SBA 7(a) calculator, seller financing, earnouts, and stress tests. Model every scenario before you make an offer. See exactly what happens if revenue drops 20%.',
  },
  {
    icon: GitCompare,
    title: 'Deal Comparison',
    description: 'Side-by-side comparison of 2-3 deals with export to CSV. Benchmark new opportunities against your pipeline.',
  },
  {
    icon: Chrome,
    title: 'Chrome Extension',
    description: 'Capture deals directly from broker sites. One click to save a listing and start analysis.',
  },
  {
    icon: Download,
    title: 'Investor-Ready Memos in 1-Click',
    description: 'Export professional deal analysis reports to share with advisors, partners, or investors. Includes executive summary, financials, red flags, and verdict.',
  },
  {
    icon: MessageSquare,
    title: 'AI Deal Chat',
    description: 'Ask questions about any deal and get instant answers. AI understands your deal context and helps you dig deeper into opportunities.',
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              run your search
            </span>
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Deal sourcing, screening, pipeline management, and analysis—all the tools searchers need in one platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-6 lg:p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-emerald-500/30 transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 inline-block group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-white/60 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
