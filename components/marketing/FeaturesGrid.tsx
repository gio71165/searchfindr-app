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
    title: 'CIM Analysis',
    description: 'AI-powered, skeptical & forensic analysis of Confidential Information Memorandums. Extract key metrics, flag inconsistencies, and surface red flags.',
  },
  {
    icon: TrendingUp,
    title: 'Financial Screening',
    description: 'Automated trend analysis, quality-of-earnings red flags, and financial health scoring. Spot issues before they become problems.',
  },
  {
    icon: LayoutDashboard,
    title: 'Pipeline Management',
    description: 'Track deals through stages, set reminders, manage verdicts (proceed/park/pass), and use the Today view to focus on what needs attention right now.',
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
    icon: Search,
    title: 'Off-Market Search',
    description: 'Find companies by industry, location, revenue range, and more. Discover opportunities others haven\'t seen.',
  },
  {
    icon: Download,
    title: 'PDF Export',
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
