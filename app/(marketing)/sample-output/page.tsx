import { ArrowRight, FileText, BarChart3, DollarSign, MapPin, AlertTriangle, CheckCircle2, Target, Clock, Plus } from 'lucide-react';
import Link from 'next/link';

export default function SampleOutputPage() {
  return (
    <div className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            See What You Get
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-4">
            Upload a CIM. Get actionable insights in under 2 minutes.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
            <Clock className="h-4 w-4" />
            <span>Average analysis time: 90 seconds</span>
          </div>
        </div>

        {/* Sample Output - Simplified */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
            {/* Document Header */}
            <div className="border-b border-slate-700/50 bg-slate-800/50 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">TechFlow Solutions LLC</h2>
                  <p className="text-slate-400 text-sm">CIM Analysis Report • Generated 2 hours ago</p>
                </div>
                <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-emerald-300 font-semibold text-sm">Confidence: B</span>
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-6 lg:p-8 space-y-6">
              {/* Executive Summary */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <FileText className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Executive Summary</h3>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <p className="text-slate-300 leading-relaxed mb-4">
                    TechFlow Solutions is a [redacted] business serving [redacted] sectors. The company has demonstrated consistent revenue growth over the past three years, with strong EBITDA margins. The business operates with minimal owner dependency and has diversified its customer base.
                  </p>
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-700/50">
                    <div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <span className="text-yellow-300 font-semibold text-sm">Recommendation: Proceed with Caution</span>
                    </div>
                    <span className="text-slate-400 text-sm">Requires QoE review</span>
                  </div>
                </div>
              </section>

              {/* Key Metrics Grid */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Key Metrics</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">Asking Price</div>
                    <div className="text-xl font-bold text-white mb-1">$[redacted]M</div>
                    <div className="text-slate-500 text-xs">[redacted]x EBITDA</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">TTM Revenue</div>
                    <div className="text-xl font-bold text-white mb-1">$[redacted]M</div>
                    <div className="text-slate-500 text-xs">+[redacted]% YoY</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">TTM EBITDA</div>
                    <div className="text-xl font-bold text-white mb-1">$[redacted]M</div>
                    <div className="text-emerald-400 text-xs">[redacted]% margin</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">Location</div>
                    <div className="text-lg font-semibold text-white mb-1">[City], [State]</div>
                    <div className="text-slate-500 text-xs">SBA Eligible</div>
                  </div>
                </div>
              </section>

              {/* Red Flags - Simplified */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Quality of Earnings Concerns</h3>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-red-400 text-xs">●</span>
                      </div>
                      <div>
                        <div className="text-white font-medium mb-1">Customer Concentration Risk</div>
                        <div className="text-slate-400 text-sm">Top customers represent significant portion of revenue.</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-red-400 text-xs">●</span>
                      </div>
                      <div>
                        <div className="text-white font-medium mb-1">Owner Dependency</div>
                        <div className="text-slate-400 text-sm">Key relationships require succession planning.</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Strengths - Simplified */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Key Strengths</h3>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-white font-medium mb-1">Recurring Revenue Model</div>
                        <div className="text-slate-400 text-sm">Strong customer retention with multi-year contracts.</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-white font-medium mb-1">Strong Profitability</div>
                        <div className="text-slate-400 text-sm">EBITDA margins above industry average.</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Decision Framework - Simplified */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <Target className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Recommended Action</h3>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <div className="text-lg font-bold text-white mb-2">Proceed with Caution</div>
                  <div className="text-slate-400 text-sm mb-4">Submit IOI but request detailed QoE review before LOI</div>
                  <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">Next Steps</div>
                  <div className="text-slate-300 text-sm space-y-1">
                    <div>• Schedule call with broker</div>
                    <div>• Request detailed addback schedule</div>
                    <div>• Verify working capital requirements</div>
                  </div>
                </div>
              </section>

              {/* Add to Pipeline CTA */}
              <div className="pt-4 border-t border-slate-700/50">
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40">
                  <Plus className="h-5 w-5" />
                  Add to Pipeline
                </button>
                <p className="text-center text-slate-400 text-xs mt-3">
                  Once added, track this deal through your pipeline stages
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid - Simplified */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-10">
            Everything You Need to Make Faster Decisions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all">
              <div className="p-3 rounded-xl border bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/30 inline-block mb-3">
                <FileText className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                AI-Powered Analysis
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Instant executive summary with verdict recommendation and key metrics—all generated in under 2 minutes.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all">
              <div className="p-3 rounded-xl border bg-red-500/20 border-red-500/30 inline-block mb-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Quality of Earnings Analysis
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Automatic flagging of QoE issues: customer concentration, revenue recognition, and owner dependency risks.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all">
              <div className="p-3 rounded-xl border bg-green-500/20 border-green-500/30 inline-block mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Strengths Identification
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                AI identifies key strengths and positive indicators to help you see the full picture.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all">
              <div className="p-3 rounded-xl border bg-cyan-500/20 border-cyan-500/30 inline-block mb-3">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Financial Metrics Extraction
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Revenue trends, EBITDA margins, and growth rates automatically calculated and displayed.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all">
              <div className="p-3 rounded-xl border bg-purple-500/20 border-purple-500/30 inline-block mb-3">
                <Target className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Decision Framework
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Clear PROCEED/PARK/PASS recommendations with specific next steps.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all">
              <div className="p-3 rounded-xl border bg-blue-500/20 border-blue-500/30 inline-block mb-3">
                <BarChart3 className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Pipeline Management
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Track deals through your pipeline stages and manage your deal flow efficiently.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="inline-block p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to analyze your deals?
            </h3>
            <p className="text-white/60 mb-6">
              Get started with SearchFindr and see how fast you can evaluate opportunities.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
