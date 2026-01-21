import { ArrowRight, Sparkles, TrendingUp, FileText, BarChart3, DollarSign, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';

export default function SampleOutputPage() {
  return (
    <div className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            See What You Get
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Upload a CIM. Get actionable insights in under 2 minutes. Here's exactly what SearchFindr delivers.
          </p>
        </div>

        {/* Beautiful App Preview */}
        <div className="relative mb-20 max-w-5xl mx-auto">
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-cyan-500/20 to-emerald-500/30 rounded-3xl blur-3xl opacity-50" />
          
          {/* App Interface */}
          <div className="relative bg-white rounded-2xl border border-white/20 shadow-2xl overflow-hidden transform scale-90 origin-top">
            {/* Browser Chrome */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 h-7 rounded-lg bg-white border border-slate-300 px-3 flex items-center ml-3 shadow-sm">
                <span className="text-xs text-slate-500">searchfindr.app/deals/acme-manufacturing</span>
              </div>
            </div>

            {/* App Content */}
            <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-white">
              {/* Executive Summary - Beautiful Card */}
              <div className="rounded-xl border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 p-6 mb-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2 bg-yellow-100 border-2 border-yellow-300 shadow-sm">
                      <AlertTriangle className="h-5 w-5 text-yellow-700" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-yellow-900">Proceed with Caution</h2>
                      <p className="text-xs text-yellow-700/80 mt-0.5">AI recommendation based on confidence & risk</p>
                    </div>
                  </div>
                  <ConfidenceBadge level="B" analyzed={true} />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-white/60 rounded-lg p-3 border border-yellow-200/50">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                      <DollarSign className="h-3 w-3" />
                      <span>Asking Price</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">$12.5M</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-yellow-200/50">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                      <DollarSign className="h-3 w-3" />
                      <span>Revenue</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">$8.2M</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-yellow-200/50">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>EBITDA</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">$1.4M</p>
                    <p className="text-xs text-slate-600 mt-0.5">17.1% margin</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-yellow-200/50">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                      <MapPin className="h-3 w-3" />
                      <span>Location</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">Austin, TX</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-yellow-200">
                  <button className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all shadow-md">
                    Proceed
                  </button>
                  <button className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white transition-all shadow-md">
                    Park
                  </button>
                  <button className="px-4 py-1.5 text-sm font-semibold rounded-lg border-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-all">
                    Pass
                  </button>
                </div>
              </div>

              {/* Red Flags - Eye-catching */}
              <div className="rounded-xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-red-100/50 p-4 mb-4 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-red-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-700" />
                  </div>
                  <h3 className="text-lg font-bold text-red-900">Red Flags</h3>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-xs text-red-900">
                    <span className="text-red-500 mt-0.5">●</span>
                    <span>Customer concentration: Top 3 customers represent 65% of revenue</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-red-900">
                    <span className="text-red-500 mt-0.5">●</span>
                    <span>Owner dependency: Founder handles all key customer relationships</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-red-900">
                    <span className="text-red-500 mt-0.5">●</span>
                    <span>Working capital: Significant seasonal fluctuations require cash management</span>
                  </li>
                </ul>
              </div>

              {/* Strengths - Beautiful */}
              <div className="rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-green-100/50 p-4 mb-4 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-green-200 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-700" />
                  </div>
                  <h3 className="text-lg font-bold text-green-900">Strengths</h3>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-xs text-green-900">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Recurring revenue model with 85% retention rate</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-green-900">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Strong EBITDA margins above industry average</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-green-900">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Scalable operations with minimal owner involvement required</span>
                  </li>
                </ul>
              </div>

              {/* Financial & Signals Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Financial Details */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">Financial Details</h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-xs uppercase text-slate-600">TTM Revenue</span>
                      <span className="font-bold text-slate-900">$8.2M</span>
                    </div>
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-xs uppercase text-slate-600">TTM EBITDA</span>
                      <span className="font-bold text-slate-900">$1.4M</span>
                    </div>
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-xs uppercase text-slate-600">EBITDA Margin</span>
                      <span className="font-bold text-emerald-600">17.1%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase text-slate-600">3Y Revenue CAGR</span>
                      <span className="font-bold text-emerald-600">+12%</span>
                    </div>
                  </div>
                </div>

                {/* Risk Signals */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">Risk & Quality Signals</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="text-xs text-slate-600 mb-0.5">Revenue Quality</div>
                      <div className="text-base font-bold text-emerald-700">High</div>
                    </div>
                    <div className="p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                      <div className="text-xs text-slate-600 mb-0.5">Customer Risk</div>
                      <div className="text-base font-bold text-yellow-700">Medium</div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="text-xs text-slate-600 mb-0.5">Management Quality</div>
                      <div className="text-base font-bold text-emerald-700">High</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Confidence */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <h3 className="text-base font-bold text-slate-900">Data Confidence</h3>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <ConfidenceBadge level="B" analyzed={true} />
                  <span className="text-xs text-slate-600">Updated 2 hours ago</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  CIM document quality: Good. Financial data extracted with moderate confidence. Some metrics require verification.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Component Explanations */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Everything You Need to Make Faster Decisions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all hover:scale-[1.02]">
              <div className="p-3 rounded-xl border bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/30 inline-block mb-4">
                <Sparkles className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                AI-Powered Summary
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Instant executive summary with verdict recommendation, key metrics, and confidence level—all in one place.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all hover:scale-[1.02]">
              <div className="p-3 rounded-xl border bg-red-500/20 border-red-500/30 inline-block mb-4">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Red Flags & QoE Issues
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Quality-of-earnings issues flagged automatically: customer concentration, revenue recognition, working capital trends.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all hover:scale-[1.02]">
              <div className="p-3 rounded-xl border bg-green-500/20 border-green-500/30 inline-block mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Strengths Analysis
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                AI identifies key strengths and positive indicators to help you see the full picture, not just problems.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all hover:scale-[1.02]">
              <div className="p-3 rounded-xl border bg-cyan-500/20 border-cyan-500/30 inline-block mb-4">
                <TrendingUp className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Financial Metrics
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Revenue trends, EBITDA margins, growth rates, and financial health indicators automatically calculated and displayed.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all hover:scale-[1.02]">
              <div className="p-3 rounded-xl border bg-yellow-500/20 border-yellow-500/30 inline-block mb-4">
                <BarChart3 className="h-6 w-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Risk & Quality Signals
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                CIM quality assessment and risk signals help you understand data reliability and deal characteristics at a glance.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all hover:scale-[1.02]">
              <div className="p-3 rounded-xl border bg-emerald-500/20 border-emerald-500/30 inline-block mb-4">
                <FileText className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Data Confidence Score
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Confidence tier (A/B/C) indicates how reliable the extracted data is, helping you prioritize verification efforts.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="inline-block p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-white mb-4">
              See it analyze your deal
            </h3>
            <p className="text-white/60 mb-6">
              Book a 15-minute demo and watch SearchFindr analyze a real CIM in real-time.
            </p>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105"
            >
              Book Demo
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
