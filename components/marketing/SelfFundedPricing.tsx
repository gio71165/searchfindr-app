import {
  FileText,
  BarChart,
  FileCheck,
  Calculator,
  Chrome,
  Users,
  Mail,
  Zap,
} from 'lucide-react';
import { Feature } from './Feature';
import { NotIncluded } from './NotIncluded';
import Link from 'next/link';

export function SelfFundedPricing() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Early Access Badge */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-semibold border border-emerald-500/30">
          <Zap className="w-4 h-4" />
          Early Access Pricing - Limited Time
        </span>
      </div>

      {/* Main Pricing Card */}
      <div className="bg-white/5 rounded-2xl shadow-xl border-2 border-emerald-500/50 p-6 sm:p-8 backdrop-blur-sm">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold mb-2 text-white">Self-Funded Searcher</h3>
          <p className="text-white/60">Perfect for bootstrapped searchers</p>
        </div>

        {/* Pricing Display */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-5xl font-bold text-white">$79</span>
            <span className="text-xl text-white/60">/month</span>
          </div>
          <p className="text-sm font-semibold text-emerald-400">
            🔒 Lock in this price forever
          </p>
          <p className="text-xs text-white/50 mt-1">
            Regular price: $99/month (after early access)
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-4 mb-8">
          <h4 className="font-semibold text-white mb-3">What's included:</h4>

          <Feature
            icon={<FileText className="w-5 h-5 text-emerald-400" />}
            text="20 CIM analyses per month"
            subtext="More than enough for most searchers"
          />

          <Feature
            icon={<BarChart className="w-5 h-5 text-emerald-400" />}
            text="Unlimited pipeline tracking"
            subtext="Track as many deals as you want"
          />

          <Feature
            icon={<FileCheck className="w-5 h-5 text-emerald-400" />}
            text="5 IOI + 2 LOI generations/month"
            subtext="Professional templates included"
          />

          <Feature
            icon={<Calculator className="w-5 h-5 text-emerald-400" />}
            text="SBA 7(a) calculator"
            subtext="With 2026 rules + manufacturing waiver"
          />

          <Feature
            icon={<Chrome className="w-5 h-5 text-emerald-400" />}
            text="Chrome extension"
            subtext="Capture deals from any listing site"
          />

          <Feature
            icon={<Users className="w-5 h-5 text-emerald-400" />}
            text="1 user seat"
            subtext="Solo operator focused"
          />

          <Feature
            icon={<Mail className="w-5 h-5 text-emerald-400" />}
            text="Email support"
            subtext="Response within 24-48 hours"
          />
        </div>

        {/* What You Don't Get (Be Honest) */}
        <div className="border-t border-white/10 pt-6 mb-8">
          <h4 className="font-semibold text-white/70 mb-3 text-sm">
            Not included (upgrade to Search Fund tier):
          </h4>
          <div className="space-y-2">
            <NotIncluded text="Unlimited CIM analyses" />
            <NotIncluded text="Team collaboration features" />
            <NotIncluded text="Investor dashboard for LPs" />
            <NotIncluded text="Custom branding on documents" />
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/pricing"
          className="block w-full py-4 bg-emerald-600 text-white rounded-lg font-semibold text-lg hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl text-center"
        >
          Lock in $79/month Forever
        </Link>

        <p className="text-center text-sm text-white/50 mt-4">
          7-day free trial • No credit card required • Cancel anytime
        </p>
      </div>

      {/* Value Proposition Below Card */}
      <div className="mt-8 text-center">
        <p className="text-white/60 mb-4">
          At $79/month, if SearchFindr saves you just <strong className="text-white">2 hours per CIM</strong>,<br />
          that's <strong className="text-white">40 hours saved per month</strong> = $600+ in value (at $15/hr).
        </p>
        <p className="text-sm text-white/50">
          Even better: catch ONE bad deal and you've saved $500K+
        </p>
      </div>
    </div>
  );
}
