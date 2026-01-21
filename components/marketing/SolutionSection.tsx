import { Upload, Sparkles, CheckCircle } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Add a company',
    description: 'Four entry points: CIM upload, financials, browser extension, or off-market search. Get started in seconds.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'AI extracts & flags real issues',
    description: 'Get instant summary, red/green flags, data confidence scores, and quality-of-earnings insights.',
  },
  {
    number: '03',
    icon: CheckCircle,
    title: 'Score, save, prioritize',
    description: 'Standardized deal profiles make it easy to compare opportunities and focus on what matters.',
  },
];

export function SolutionSection() {
  return (
    <section id="solution" className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Turn raw deal inputs into{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              standardized screening output
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="relative group"
              >
                {/* Step Number Background */}
                <div className="absolute -top-4 -left-4 text-7xl font-bold text-white/5 group-hover:text-emerald-500/10 transition-colors">
                  {step.number}
                </div>

                <div className="relative p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-emerald-500/30 transition-all duration-300 h-full">
                  <div className="mb-6">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 inline-block">
                      <Icon className="h-8 w-8 text-emerald-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
