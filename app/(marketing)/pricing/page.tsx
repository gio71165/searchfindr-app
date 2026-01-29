'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Zap, Crown, ArrowRight, MessageSquare, Workflow } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/supabaseClient';
import { TrustBoxModal } from '@/components/modals/TrustBoxModal';
import { TrialTerms } from '@/components/marketing/TrialTerms';

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{
    tier: 'starter' | 'pro' | 'investor';
    plan: 'founding_member' | 'standard';
    billing: 'monthly' | 'yearly';
  } | null>(null);

  async function handleCheckout(
    tier: 'starter' | 'pro' | 'investor',
    plan: 'founding_member' | 'standard',
    billingCycle: 'monthly' | 'yearly'
  ) {
    // Investor Portfolio redirects to demo
    if (tier === 'investor') {
      router.push('/demo');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push(`/signup?tier=${tier}&plan=${plan}&billing=${billingCycle}`);
        return;
      }
      
      // Show trust modal before proceeding to checkout
      setPendingCheckout({ tier, plan, billing: billingCycle });
      setShowTrustModal(true);
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function proceedToCheckout() {
    if (!pendingCheckout) return;
    setShowTrustModal(false);
    router.push(`/checkout?tier=${pendingCheckout.tier}&plan=${pendingCheckout.plan}&billing=${pendingCheckout.billing}`);
  }

  return (
    <div className="min-h-screen bg-[#0b0f17]">
      {/* Founding Member Banner */}
      <div className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-b border-emerald-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold">
              <Crown className="h-5 w-5" />
              <span className="text-lg">
                Join the First 50 Founding Members
              </span>
            </div>
            <p className="text-sm text-emerald-200/80">
              Lock in $79 (Starter) or $179 (Pro) per month forever. Standard pricing is $149 and $299 respectively.
            </p>
            <p className="text-xs text-emerald-200/60">
              Offer expires March 1, 2026 or after the first 50 members join.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Simple, Transparent Pricing
          </h1>
          <p className="text-sm sm:text-base text-gray-400 mb-4">
            Start your <span className="text-emerald-400 font-semibold">7-day free trial</span> • Credit card required • Cancel anytime with one click
          </p>
        </div>
        
        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl border border-gray-700 p-1.5 bg-gray-900">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-emerald-400">Save 20%</span>
            </button>
          </div>
        </div>
        
        {/* Pricing Cards - Three Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {/* Starter Card */}
          <PricingCard
            name="Starter"
            badge="Founding Member"
            monthlyPrice={79}
            originalPrice={149}
            yearlyPrice={Math.round(79 * 12 * 0.8)}
            billingCycle={billingCycle}
            features={[
              '20 CIM analyses/month',
              '10 Financial models/month',
              '5 IOI generations',
              '3 LOI generations',
              'AI chat on every deal',
              'Pipeline workflow management',
              'Email support',
              'Forever pricing locked 🔒',
            ]}
            onCheckout={() => handleCheckout('starter', 'founding_member', billingCycle)}
            isLoading={isLoading}
            hoveredCard={hoveredCard}
            setHoveredCard={setHoveredCard}
            cardId="starter"
          />

          {/* Pro Card - Highlighted */}
          <PricingCard
            name="Pro"
            badge="Most Popular • Founding Member"
            monthlyPrice={179}
            originalPrice={299}
            yearlyPrice={Math.round(179 * 12 * 0.8)}
            billingCycle={billingCycle}
            features={[
              '75 CIM analyses/month',
              '50 Financial models/month',
              '20 IOI generations',
              '10 LOI generations',
              'AI chat on every deal',
              'Pipeline workflow management',
              'Priority support',
              'Forever pricing locked 🔒',
              '1-on-1 founder access',
              'Priority feature access',
            ]}
            onCheckout={() => handleCheckout('pro', 'founding_member', billingCycle)}
            isLoading={isLoading}
            hoveredCard={hoveredCard}
            setHoveredCard={setHoveredCard}
            cardId="pro"
            highlighted={true}
          />

          {/* Investor Portfolio Card */}
          <PricingCard
            name="Investor Portfolio"
            badge="For Investors"
            monthlyPrice={null}
            originalPrice={null}
            yearlyPrice={null}
            billingCycle={billingCycle}
            features={[
              'Full investor dashboard',
              'Multi-searcher tracking',
              '5-10 dashboard seats',
              'View all linked deals',
              'AI chat on every deal',
              'Pipeline workflow management',
              'White-glove onboarding',
              'Dedicated support',
            ]}
            onCheckout={() => handleCheckout('investor', 'standard', billingCycle)}
            isLoading={isLoading}
            hoveredCard={hoveredCard}
            setHoveredCard={setHoveredCard}
            cardId="investor"
            customPricing={true}
          />
        </div>

        {/* Founding Member Box */}
        <FoundingMemberBox 
          onCheckout={handleCheckout}
          billingCycle={billingCycle}
          isLoading={isLoading}
        />

        {/* Key Features Highlight */}
        <KeyFeaturesSection />
      </div>
      
      {/* FAQ Section */}
      <FAQSection />
      
      {/* Trial Terms Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <TrialTerms />
        </div>
      </section>
      
      {/* Final CTA Section */}
      <FinalCTA />
      
      {/* Trust Box Modal */}
      <TrustBoxModal
        isOpen={showTrustModal}
        onClose={() => {
          setShowTrustModal(false);
          setPendingCheckout(null);
        }}
        onContinue={proceedToCheckout}
      />
    </div>
  );
}

// Pricing Card Component
function PricingCard({
  name,
  badge,
  monthlyPrice,
  originalPrice,
  yearlyPrice,
  billingCycle,
  features,
  onCheckout,
  isLoading,
  hoveredCard,
  setHoveredCard,
  cardId,
  highlighted = false,
  customPricing = false,
}: {
  name: string;
  badge: string;
  monthlyPrice: number | null;
  originalPrice: number | null;
  yearlyPrice: number | null;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  onCheckout: () => void;
  isLoading: boolean;
  hoveredCard: string | null;
  setHoveredCard: (card: string | null) => void;
  cardId: string;
  highlighted?: boolean;
  customPricing?: boolean;
}) {
  const displayPrice = customPricing 
    ? null 
    : billingCycle === 'monthly' 
      ? monthlyPrice 
      : yearlyPrice;
  const displayPeriod = billingCycle === 'monthly' ? 'month' : 'year';
  const monthlyEquivalent = customPricing || !yearlyPrice || !displayPrice
    ? null
    : billingCycle === 'yearly' 
      ? Math.round(yearlyPrice / 12) 
      : monthlyPrice;

  return (
    <div 
      className={`relative transition-all duration-300 ${
        hoveredCard === cardId ? 'scale-105 z-10' : 'scale-100'
      }`}
      onMouseEnter={() => setHoveredCard(cardId)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-full text-xs font-bold shadow-lg shadow-emerald-500/50">
            <Crown className="w-4 h-4" />
            Most Popular
          </span>
        </div>
      )}

      <div className={`bg-gradient-to-br ${highlighted ? 'from-emerald-900/30 to-gray-900' : 'from-gray-800 to-gray-900'} rounded-xl shadow-2xl border-2 ${highlighted ? 'border-emerald-500' : 'border-gray-700'} p-6 ${highlighted ? 'pt-12' : 'pt-6'} transition-all ${
        hoveredCard === cardId ? highlighted ? 'shadow-emerald-500/50 ring-4 ring-emerald-500/30' : 'shadow-gray-500/50' : ''
      }`}>
        {highlighted && (
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-emerald-500/20 rounded-xl blur-xl opacity-60 -z-10" />
        )}

        {/* Badge */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-300 rounded-lg text-xs font-bold mb-3">
            {badge.includes('Founding Member') && <Zap className="w-3 h-3" />}
            {badge}
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {name}
          </h3>
        </div>
        
        {/* Pricing */}
        <div className="text-center mb-6">
          {customPricing ? (
            <div className="mb-2">
              <span className="text-4xl font-bold text-white">Custom</span>
              <span className="text-lg text-gray-400 ml-2">Pricing</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-2 mb-2">
                {originalPrice && (
                  <span className="text-xl text-gray-500 line-through">
                    ${originalPrice}
                  </span>
                )}
                <span className="text-5xl font-bold text-white">
                  ${displayPrice}
                </span>
                <span className="text-lg text-gray-400">/{displayPeriod}</span>
              </div>
              {billingCycle === 'yearly' && monthlyEquivalent && (
                <p className="text-sm text-emerald-400 mb-2">
                  ${monthlyEquivalent}/mo billed annually
                </p>
              )}
              {badge.includes('Founding Member') && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold mt-2">
                  <Zap className="w-3 h-3" />
                  Locked forever
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Features */}
        <div className="space-y-2 mb-6 text-left">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-300">{feature}</span>
            </div>
          ))}
        </div>
        
        {/* CTA */}
        {customPricing ? (
          <Link
            href="/demo"
            className="block w-full py-3 bg-white/10 text-white rounded-lg font-bold text-base hover:bg-white/20 transition-all border-2 border-white/20 text-center"
          >
            Book a Demo
          </Link>
        ) : (
          <>
            <div className="mb-3 text-center">
              <p className="text-sm font-bold text-white bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                7-day free trial • $0 due today
              </p>
            </div>
            <button
              onClick={onCheckout}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-bold text-base hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
            >
              {isLoading ? 'Starting...' : 'Start 7-Day Free Trial'}
            </button>
            <p className="text-center text-xs text-gray-400">
              Credit card required • Cancel anytime
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Founding Member Box
function FoundingMemberBox({
  onCheckout,
  billingCycle,
  isLoading,
}: {
  onCheckout: (tier: 'starter' | 'pro', plan: 'founding_member', billing: 'monthly' | 'yearly') => void;
  billingCycle: 'monthly' | 'yearly';
  isLoading: boolean;
}) {
  const monthlyPriceStarter = 79;
  const monthlyPricePro = 179;
  const yearlyPriceStarter = Math.round(monthlyPriceStarter * 12 * 0.8);
  const yearlyPricePro = Math.round(monthlyPricePro * 12 * 0.8);
  const displayPriceStarter = billingCycle === 'monthly' ? monthlyPriceStarter : yearlyPriceStarter;
  const displayPricePro = billingCycle === 'monthly' ? monthlyPricePro : yearlyPricePro;
  const displayPeriod = billingCycle === 'monthly' ? 'month' : 'year';

  return (
    <div className="max-w-4xl mx-auto mt-12 mb-8">
      <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/20 rounded-2xl border-2 border-emerald-500/50 p-8 lg:p-12">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <Crown className="h-6 w-6 text-emerald-400" />
            <h3 className="text-2xl font-bold text-white">
              🏆 Join the First 50 Founding Members
            </h3>
          </div>
        </div>

        <ul className="space-y-3 mb-8 max-w-2xl mx-auto">
          <li className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="text-white">
              Lock in $79 or $179/mo forever (increases to $149/$299 on March 1)
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="text-white">
              Direct access to founder for feature requests
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="text-white">
              Priority access to V2 features (broker partnerships, deal sourcing)
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="text-white">
              Be featured in our launch case studies
            </span>
          </li>
        </ul>

        <div className="text-center">
          <p className="text-white/80 mb-4 text-sm">
            Choose your Founding Member plan:
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-2xl mx-auto">
            {/* Starter Button */}
            <button
              onClick={() => onCheckout('starter', 'founding_member', billingCycle)}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-bold text-lg hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>Starter - ${displayPriceStarter}/{displayPeriod}</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            {/* Pro Button */}
            <button
              onClick={() => onCheckout('pro', 'founding_member', billingCycle)}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-bold text-lg hover:from-cyan-400 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>Pro - ${displayPricePro}/{displayPeriod}</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          <p className="text-white/60 text-xs mt-4">
            Both plans include 7-day free trial • Credit card required
          </p>
        </div>
      </div>
    </div>
  );
}

// FAQ Section
function FAQSection() {
  const faqs = [
    {
      q: "What happens after my 7-day free trial?",
      a: "After your trial, your subscription automatically starts. You can cancel anytime from your settings page—no questions asked. Your access continues until the end of your billing period."
    },
    {
      q: "Can I change plans later?",
      a: "Yes! You can upgrade or downgrade your plan at any time from your settings. Changes take effect immediately, and we'll prorate any differences."
    },
    {
      q: "What is Founding Member pricing?",
      a: "Founding Members lock in $79 (Starter) or $179 (Pro) per month forever. Standard pricing is $149 and $299 respectively. This offer expires March 1, 2026 or after the first 50 members join."
    },
    {
      q: "Do I get a refund if I cancel?",
      a: "We offer a 30-day money-back guarantee. If you're not satisfied within the first 30 days, contact us for a full refund—no questions asked."
    },
    {
      q: "What happens if I hit my monthly limits?",
      a: "You'll get a notification when you're approaching your limits. You can upgrade to the Pro tier for higher limits, or wait until your next billing cycle when limits reset."
    },
    {
      q: "What's included in Investor Portfolio?",
      a: "Investor Portfolio is custom-priced for investors tracking multiple searchers. It includes full investor dashboard access, multi-searcher tracking, 5-10 dashboard seats, and dedicated support. Contact us for pricing."
    }
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">{faq.q}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Key Features Section
function KeyFeaturesSection() {
  return (
    <section className="max-w-6xl mx-auto mt-16 mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Included in All Plans
        </h2>
        <p className="text-gray-400">
          Powerful features to help you manage your deal pipeline
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Chat Feature */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex-shrink-0">
              <MessageSquare className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                AI Chat on Every Deal
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Ask questions about any deal and get instant answers. AI understands your deal context, suggests pipeline actions (proceed/park/pass), and helps you dig deeper into opportunities.
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline Workflow Feature */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex-shrink-0">
              <Workflow className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Pipeline Workflow Management
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Track deals through stages (new → reviewing → IOI → LOI → DD), set verdicts, manage next actions, and never miss a follow-up. AI suggests workflow actions based on deal analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Final CTA
function FinalCTA() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to start your search smarter?
        </h2>
        <p className="text-lg text-gray-400 mb-8">
          Join our early adopter program and lock in lifetime pricing
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/pricing"
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-bold text-lg hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg"
          >
            Start Your Free Trial
          </Link>
          <Link
            href="/demo"
            className="px-8 py-4 border-2 border-white/20 bg-white/5 text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-all"
          >
            Book a Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
