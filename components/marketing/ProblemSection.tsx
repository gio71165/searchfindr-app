export function ProblemSection() {
  return (
    <section id="problem" className="py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white/10 to-white/5 border-y border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-8 tracking-tight">
            You've read 47 CIMs this quarter.{' '}
            <br className="hidden sm:block" />
            3 were worth a call. That's 88 hours wasted.
          </h2>
          <p className="text-center text-white/70 max-w-2xl mx-auto text-lg leading-relaxed">
            The average searcher spends 15+ hours per week reading CIMs.
            Most are garbage. You just can't tell until page 30.
            <br /><br />
            <strong className="text-white">SearchFindr reads the CIM for you. In 60 seconds.</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
