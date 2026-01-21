import { Clock, XCircle, AlertTriangle, FileQuestion } from 'lucide-react';

const problems = [
  {
    icon: Clock,
    title: 'Manual triage burns weeks',
    description: 'Spending days reading CIMs and financials before you even know if a deal is worth pursuing.',
  },
  {
    icon: XCircle,
    title: 'Most deals aren\'t a real fit',
    description: 'Wading through dozens of opportunities that don\'t match your criteria, wasting precious time.',
  },
  {
    icon: AlertTriangle,
    title: 'Risk shows up late',
    description: 'Missing red flags and quality-of-earnings issues until deep in diligence, when it\'s too late.',
  },
  {
    icon: FileQuestion,
    title: 'Inconsistent diligence output',
    description: 'Every deal analyzed differently, making it impossible to compare opportunities objectively.',
  },
];

export function ProblemSection() {
  return (
    <section id="problem" className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Early-stage deal screening is{' '}
            <span className="text-red-400">slow</span>,{' '}
            <span className="text-red-400">messy</span>, and{' '}
            <span className="text-red-400">inconsistent</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <div
                key={index}
                className="group p-6 lg:p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20 transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
                    <Icon className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {problem.title}
                    </h3>
                    <p className="text-white/60 leading-relaxed">
                      {problem.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
