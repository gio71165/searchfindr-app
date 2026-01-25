import {
  Infinity,
  Users,
  BarChart3,
  MessageSquare,
  Palette,
  Headphones,
  Database,
} from 'lucide-react';
import { Feature } from './Feature';

const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/dRm4gz1ReaTxct01lKawo00';

export function TraditionalSearchFundPricing() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/5 rounded-2xl shadow-xl border-2 border-white/20 p-6 sm:p-8 backdrop-blur-sm">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold mb-2 text-white">Traditional Search Fund</h3>
          <p className="text-white/60">For funded searchers and search funds</p>
        </div>

        {/* Pricing Display */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-5xl font-bold text-white">$149</span>
            <span className="text-xl text-white/60">/month</span>
          </div>
          <p className="text-sm text-white/60">
            or $1,490/year (save $298)
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-4 mb-8">
          <h4 className="font-semibold text-white mb-3">Everything in Self-Funded, plus:</h4>

          <Feature
            icon={<Infinity className="w-5 h-5 text-emerald-400" />}
            text="UNLIMITED CIM analyses"
            highlight={true}
            subtext="Analyze as many deals as you want"
          />

          <Feature
            icon={<Infinity className="w-5 h-5 text-emerald-400" />}
            text="UNLIMITED IOI/LOI generation"
            highlight={true}
            subtext="No monthly limits"
          />

          <Feature
            icon={<Users className="w-5 h-5 text-emerald-400" />}
            text="3 user seats"
            highlight={true}
            subtext="Searcher + analyst + advisor"
          />

          <Feature
            icon={<BarChart3 className="w-5 h-5 text-emerald-400" />}
            text="Investor dashboard (1 LP portal)"
            highlight={true}
            subtext="Real-time deal flow reporting for LPs"
          />

          <Feature
            icon={<MessageSquare className="w-5 h-5 text-emerald-400" />}
            text="Team collaboration"
            highlight={true}
            subtext="Comments, assignments, shared notes"
          />

          <Feature
            icon={<Palette className="w-5 h-5 text-emerald-400" />}
            text="Custom branding"
            highlight={true}
            subtext="Your logo on IOI/LOI documents"
          />

          <Feature
            icon={<Headphones className="w-5 h-5 text-emerald-400" />}
            text="Priority support"
            subtext="Email + chat, same-day response"
          />

          <Feature
            icon={<Database className="w-5 h-5 text-emerald-400" />}
            text="500 document storage"
            subtext="vs. 50 on Self-Funded tier"
          />
        </div>

        {/* CTA Button */}
        <a
          href={STRIPE_PAYMENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 bg-gray-900 text-white rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl text-center"
        >
          Start Free Trial
        </a>

        <p className="text-center text-sm text-white/50 mt-4">
          7-day free trial • No credit card required • Cancel anytime
        </p>
      </div>

      {/* Value Proposition */}
      <div className="mt-8 text-center">
        <p className="text-white/60">
          The investor dashboard alone saves you <strong className="text-white">10+ hours/month</strong><br />
          by eliminating "Any updates?" emails from LPs.
        </p>
      </div>
    </div>
  );
}
