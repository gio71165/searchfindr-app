export function ProblemSection() {
  return (
    <section id="problem" className="py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white/10 to-white/5 border-y border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-8 tracking-tight">
            You've reviewed 47 deals this quarter.{' '}
            <br className="hidden sm:block" />
            3 were worth a call. That's 88 hours wasted = $22,000 in opportunity cost at $250/hr.
          </h2>
          <p className="text-center text-white/70 max-w-2xl mx-auto text-lg leading-relaxed">
            The average searcher spends 15+ hours per week on deal screening, pipeline management, and analysis.
            Most deals are garbage. You just can't tell until you've wasted hours digging in.
            <br /><br />
            <strong className="text-white">SearchFindr automates your entire search workflow. Get deal certainty in 60 seconds.</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
