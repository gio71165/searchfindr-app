import { Rocket } from 'lucide-react';
import { PricingCard } from '@/components/marketing/PricingCard';

const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/dRm4gz1ReaTxct01lKawo00';
const CALENDLY_URL = 'https://calendly.com/gio-searchfindr/15min';

const faqs = [
  {
    question: 'What happens after I purchase?',
    answer: 'You\'ll receive an email with login credentials within 24 hours. You can start analyzing deals immediately.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'We offer a 30-day money-back guarantee. If you\'re not satisfied, we\'ll refund your first payment.',
  },
  {
    question: 'What if I need more than the limits?',
    answer: 'Contact us and we can discuss custom plans for high-volume users. Most searchers find the Pro plan sufficient.',
  },
  {
    question: 'Do you offer discounts for students?',
    answer: 'Yes! Students enrolled in MBA programs can get 20% off. Contact us with your student email for a discount code.',
  },
  {
    question: 'Can I upgrade or downgrade later?',
    answer: 'Absolutely. You can change your plan at any time. Upgrades take effect immediately, downgrades at the end of your billing cycle.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards through Stripe. Enterprise customers can arrange invoicing.',
  },
  {
    question: 'Is my deal data secure?',
    answer: 'Yes. All data is encrypted in transit and at rest. We use industry-standard security practices and never share your deal information.',
  },
];

export default function PricingPage() {
  return (
    <div className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 backdrop-blur-sm">
              <Rocket className="h-4 w-4" />
              <span>46 of 50 early bird spots remaining</span>
            </div>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Lock in{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              $149/month
            </span>{' '}
            before it's gone
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Early bird pricing ends when 50 spots fill. Public launch pricing will be $249/month.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          {/* Early Bird */}
          <PricingCard
            name="Early Bird"
            price="$149"
            period="/month"
            description="Locked forever"
            originalPrice="$399"
            badge="Limited Time"
            highlight={true}
            features={[
              'Unlimited CIM analyses',
              'Unlimited financial screenings',
              'Unlimited off-market searches',
              'Unlimited saved deals',
              'All features included',
              'Priority support',
              '30-day money-back guarantee',
            ]}
            ctaText="Lock in $149/mo Forever"
            ctaHref={STRIPE_PAYMENT_URL}
          />

          {/* Pro */}
          <PricingCard
            name="Pro"
            price="$249"
            period="/month"
            description="After early bird"
            features={[
              '15 CIM analyses/month',
              '10 financial screenings/month',
              '30 off-market searches/month',
              '100 saved deals',
              'All features included',
              'Email support',
              '30-day money-back guarantee',
            ]}
            ctaText="Coming Soon"
            ctaHref={CALENDLY_URL}
          />

          {/* Unlimited */}
          <PricingCard
            name="Unlimited"
            price="$399"
            period="/month"
            description="For high-volume users"
            features={[
              'Unlimited CIM analyses',
              'Unlimited financial screenings',
              'Unlimited off-market searches',
              'Unlimited saved deals',
              'All features included',
              'Priority support',
              'Custom integrations',
              '30-day money-back guarantee',
            ]}
            ctaText="Contact Sales"
            ctaHref={CALENDLY_URL}
          />
        </div>

        {/* Comparison Table */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Compare Plans
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-400">Early Bird</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">Pro</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">Unlimited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr>
                    <td className="px-6 py-4 text-sm text-white/80">CIM Analyses</td>
                    <td className="px-6 py-4 text-center text-sm text-emerald-400 font-medium">Unlimited</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">15/month</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-white/80">Financial Screenings</td>
                    <td className="px-6 py-4 text-center text-sm text-emerald-400 font-medium">Unlimited</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">10/month</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-white/80">Off-Market Searches</td>
                    <td className="px-6 py-4 text-center text-sm text-emerald-400 font-medium">Unlimited</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">30/month</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-white/80">Saved Deals</td>
                    <td className="px-6 py-4 text-center text-sm text-emerald-400 font-medium">Unlimited</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">100</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-white/80">Support</td>
                    <td className="px-6 py-4 text-center text-sm text-emerald-400 font-medium">Priority</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">Email</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">Priority</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-white/80">Price</td>
                    <td className="px-6 py-4 text-center text-sm text-emerald-400 font-bold">$149/mo</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">$249/mo</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">$399/mo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white mb-2">
                  {faq.question}
                </h3>
                <p className="text-white/60 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <div className="inline-block p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to get started?
            </h3>
            <p className="text-white/60 mb-6">
              Lock in early bird pricing before spots fill up.
            </p>
            <a
              href={STRIPE_PAYMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105"
            >
              Lock in $149/mo Forever
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
