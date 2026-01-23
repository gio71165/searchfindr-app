'use client';

import { SAMPLE_ANALYSIS } from '@/lib/sample-data/sample-analysis';
import { AlertTriangle, CheckCircle2, FileText, BarChart3, TrendingUp, MapPin, Building2, DollarSign, ArrowRight, User, Target } from 'lucide-react';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';

export default function SampleAnalysisPage() {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityBadge = (severity: string) => {
    const severityLower = severity.toLowerCase();
    if (severityLower === 'high') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-300">
          High
        </span>
      );
    }
    if (severityLower === 'medium') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
        Low
      </span>
    );
  };

  const getVerdictConfig = (recommendation: string) => {
    if (recommendation === 'park') {
      return {
        icon: AlertTriangle,
        label: 'Park',
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-700',
      };
    }
    if (recommendation === 'proceed') {
      return {
        icon: CheckCircle2,
        label: 'Proceed',
        color: 'green',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-700',
      };
    }
    return {
      icon: AlertTriangle,
      label: 'Pass',
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
    };
  };

  const verdictConfig = getVerdictConfig(SAMPLE_ANALYSIS.verdict.recommendation);
  const VerdictIcon = verdictConfig.icon;

  return (
    <div className="pt-24 pb-20 lg:pt-32 lg:pb-32 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight">
            This is what you get in 60 seconds
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-6">
            Upload a CIM. Get comprehensive AI analysis with red flags, QoE insights, and actionable recommendations.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
            <span>Sample Analysis</span>
          </div>
        </div>

        {/* Sample Analysis Display */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden mb-12 relative">
          {/* Watermark */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
            <div className="text-slate-200 text-6xl font-bold opacity-10 transform -rotate-12 select-none">
              SAMPLE ANALYSIS
            </div>
          </div>

          <div className="relative z-10 p-6 lg:p-8 space-y-6">
            {/* Executive Summary Card */}
            <div className={`rounded-xl border-2 ${verdictConfig.borderColor} ${verdictConfig.bgColor} p-6 lg:p-8`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${verdictConfig.bgColor} ${verdictConfig.borderColor} border`}>
                    <VerdictIcon className={`h-6 w-6 ${verdictConfig.textColor}`} />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${verdictConfig.textColor}`}>
                      {SAMPLE_ANALYSIS.company_name}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {SAMPLE_ANALYSIS.industry} • {SAMPLE_ANALYSIS.location}
                    </p>
                  </div>
                </div>
                <ConfidenceBadge level={SAMPLE_ANALYSIS.verdict.confidence as 'A' | 'B' | 'C'} analyzed={true} />
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Asking Price</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">
                    {formatMoney(SAMPLE_ANALYSIS.asking_price)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Revenue (TTM)</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">
                    {formatMoney(SAMPLE_ANALYSIS.revenue_ttm)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>EBITDA (TTM)</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">
                    {formatMoney(SAMPLE_ANALYSIS.ebitda_ttm)}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Margin: {SAMPLE_ANALYSIS.ebitda_margin}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <MapPin className="h-4 w-4" />
                    <span>Location</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{SAMPLE_ANALYSIS.location}</p>
                </div>
              </div>

              {/* Verdict Recommendation */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-slate-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700 mb-1">AI Recommendation: {verdictConfig.label}</p>
                    <p className="text-sm text-slate-600">{SAMPLE_ANALYSIS.verdict.reasoning}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QoE Red Flags - Blurred */}
            <div className="rounded-lg border border-orange-200 bg-orange-50 border-l-4 border-l-orange-500 p-6 relative overflow-hidden">
              <div className="absolute inset-0 backdrop-blur-md bg-white/30 z-10 flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Quality of Earnings Analysis</p>
                  <p className="text-xs text-slate-600 mt-1">{SAMPLE_ANALYSIS.qoe_red_flags.length} red flags identified</p>
                </div>
              </div>
              <div className="blur-sm opacity-30">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h3 className="text-xl font-semibold text-slate-900">Quality of Earnings Analysis</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                    {SAMPLE_ANALYSIS.qoe_red_flags.length}
                  </span>
                </div>
                <ul className="space-y-3">
                  {SAMPLE_ANALYSIS.qoe_red_flags.slice(0, 2).map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {flag.severity === 'high' ? '❗' : flag.severity === 'medium' ? '⚠️' : 'ℹ️'}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityBadge(flag.severity)}
                          <span className="text-xs font-medium text-slate-600 uppercase">
                            {flag.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{flag.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Red Flags - Blurred */}
            <div className="rounded-lg border border-red-200 bg-red-50 border-l-4 border-l-red-500 p-6 relative overflow-hidden">
              <div className="absolute inset-0 backdrop-blur-md bg-white/30 z-10 flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Red Flags Detected</p>
                  <p className="text-xs text-slate-600 mt-1">{SAMPLE_ANALYSIS.red_flags.length} critical issues found</p>
                </div>
              </div>
              <div className="blur-sm opacity-30">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="text-xl font-semibold text-slate-900">Red Flags</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    {SAMPLE_ANALYSIS.red_flags.length}
                  </span>
                </div>
                <ul className="space-y-3">
                  {SAMPLE_ANALYSIS.red_flags.slice(0, 2).map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{flag.title}</span>
                          {getSeverityBadge(flag.severity)}
                        </div>
                        <p className="text-sm text-slate-700">{flag.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Strengths */}
            <div className="rounded-lg border border-green-200 bg-green-50 border-l-4 border-l-green-500 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="text-xl font-semibold text-slate-900">Strengths</h3>
              </div>
              <ul className="space-y-2">
                {SAMPLE_ANALYSIS.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Investment Memo - Shortened */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-slate-600" />
                <h3 className="text-xl font-semibold text-slate-900">AI Investment Memo</h3>
              </div>
              <div className="text-sm leading-relaxed text-slate-700 line-clamp-4">
                {SAMPLE_ANALYSIS.ai_summary.split('\n').slice(0, 3).join('\n')}
                <span className="text-slate-500 italic">... (full analysis available in your dashboard)</span>
              </div>
            </div>

            {/* Financial Details - Compact */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-slate-600" />
                <h3 className="text-xl font-semibold text-slate-900">Financial Snapshot</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase text-slate-600 mb-1">Revenue (TTM)</p>
                  <p className="font-medium text-slate-900">{SAMPLE_ANALYSIS.financials.revenue_ttm}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-600 mb-1">EBITDA (TTM)</p>
                  <p className="font-medium text-slate-900">{SAMPLE_ANALYSIS.financials.ebitda_ttm}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-600 mb-1">EBITDA Margin</p>
                  <p className="font-medium text-slate-900">{SAMPLE_ANALYSIS.financials.ebitda_margin_ttm}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-600 mb-1">3Y Revenue CAGR</p>
                  <p className="font-medium text-slate-900">{SAMPLE_ANALYSIS.financials.revenue_cagr_3y}</p>
                </div>
              </div>
            </div>

            {/* Owner Interview Questions - Blurred */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 relative overflow-hidden">
              <div className="absolute inset-0 backdrop-blur-md bg-white/30 z-10 flex items-center justify-center">
                <div className="text-center">
                  <User className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Owner Interview Questions</p>
                  <p className="text-xs text-slate-600 mt-1">{SAMPLE_ANALYSIS.owner_interview_questions.length} targeted questions generated</p>
                </div>
              </div>
              <div className="blur-sm opacity-30">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-slate-600" />
                  <h3 className="text-xl font-semibold text-slate-900">Owner Interview Questions</h3>
                </div>
                <div className="space-y-3">
                  {SAMPLE_ANALYSIS.owner_interview_questions.slice(0, 3).map((q, idx) => (
                    <div key={idx} className="border-l-2 border-slate-200 pl-4">
                      <span className="text-xs font-medium text-slate-500 uppercase">{q.category}</span>
                      <p className="text-sm text-slate-700 mt-1">{q.question}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Decision Framework - Compact */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-slate-600" />
                <h3 className="text-xl font-semibold text-slate-900">Decision Framework</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Primary Reason</p>
                  <p className="text-sm text-slate-600 line-clamp-2">{SAMPLE_ANALYSIS.verdict.primary_reason}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Recommended Next Action</p>
                  <p className="text-sm text-slate-600">{SAMPLE_ANALYSIS.verdict.recommended_next_action}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="inline-block p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to analyze your deals?
            </h3>
            <p className="text-white/60 mb-6 max-w-xl">
              Get comprehensive AI analysis in under 60 seconds. Upload a CIM and see what SearchFindr can do for your deal screening.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105"
              >
                View Pricing
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg border-2 border-white/20 bg-white/5 text-base font-semibold text-white hover:bg-white/10 transition-all"
              >
                Try it yourself
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
