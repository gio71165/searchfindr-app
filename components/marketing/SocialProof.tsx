export function SocialProof() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-y border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-white/40 mb-6 text-sm uppercase tracking-wider text-center">
            Built for searchers
          </h3>
          <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-xl border border-white/10 bg-white/5">
            <div className="flex-shrink-0">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                G
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-lg text-white/90 leading-relaxed mb-2">
                "I built SearchFindr because I watched a friend waste 200+ hours on deals that should've been obvious passes. Now I want to help searchers avoid the same mistake."
              </p>
              <p className="text-sm text-white/60">
                — Gio, Founder
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
