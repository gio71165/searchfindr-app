'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Zap, Users, Infinity, FileText, BarChart, Calculator, Chrome, Mail, MessageSquare, Palette, Headphones, Database, Crown, Video, Info } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/supabaseClient';
import { TrustBoxModal } from '@/components/modals/TrustBoxModal';
import { TrialTerms } from '@/components/marketing/TrialTerms';

export default function PricingPage() {
  const router = useRouter();
  const [searcherType, setSearcherType] = useState<'traditional' | 'self_funded'>('self_funded');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{
    tier: 'self_funded' | 'search_fund';
    plan: 'early_bird' | 'standard';
    billing: 'monthly' | 'yearly';
  } | null>(null);

  async function handleCheckout(
    tier: 'self_funded' | 'search_fund',
    plan: 'early_bird' | 'standard',
    billingCycle: 'monthly' | 'yearly'
  ) {
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
      {/* Early Adopter Banner - Top of Page */}
      <div className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-b border-emerald-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold">
              <span className="text-lg">
                First 50 customers get early bird pricing locked forever
              </span>
            </div>
            <p className="text-sm text-emerald-200/80">
              Traditional Search Fund early bird: Lock in $149/mo forever. Price increases to $249/mo on March 1.
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
            Start your <span className="text-emerald-400 font-semibold">7-day free trial</span> • $0 due today • Cancel anytime with one click
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex flex-col items-center justify-center mb-6 gap-4">
          <div className="inline-flex rounded-xl border border-gray-700 p-1.5 bg-gray-900 w-full sm:w-auto">
            <button
              onClick={() => setSearcherType('self_funded')}
              className={`px-4 sm:px-8 py-3 rounded-lg text-base font-semibold transition-all flex-1 sm:flex-none ${
                searcherType === 'self_funded'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="block">Self-Funded Searcher</span>
              <span className="block text-xs font-normal mt-1 opacity-80">
                Bootstrapping your search
              </span>
            </button>
            
            <button
              onClick={() => setSearcherType('traditional')}
              className={`px-4 sm:px-8 py-3 rounded-lg text-base font-semibold transition-all flex-1 sm:flex-none ${
                searcherType === 'traditional'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="block">Traditional Search Fund</span>
              <span className="block text-xs font-normal mt-1 opacity-80">
                Raised capital from investors
              </span>
            </button>
          </div>
          
          {/* Billing Cycle Toggle */}
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
        
        {/* Pricing Cards - Compact Side-by-Side */}
        {searcherType === 'self_funded' ? (
          <SelfFundedPricingCards 
            onCheckout={handleCheckout} 
            isLoading={isLoading} 
            billingCycle={billingCycle}
            hoveredCard={hoveredCard}
            setHoveredCard={setHoveredCard}
          />
        ) : (
          <TraditionalSearchFundPricingCards 
            onCheckout={handleCheckout} 
            isLoading={isLoading} 
            billingCycle={billingCycle}
            hoveredCard={hoveredCard}
            setHoveredCard={setHoveredCard}
          />
        )}
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

// Feature Component
function Feature({ 
  icon, 
  text, 
  highlight = false,
  muted = false 
}: {
  icon: React.ReactNode;
  text: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className={`flex-shrink-0 mt-0.5 ${muted ? 'text-gray-500' : highlight ? 'text-emerald-400' : 'text-emerald-500'}`}>
        {icon}
      </div>
      <p className={`text-xs ${muted ? 'text-gray-500' : highlight ? 'text-emerald-400 font-semibold' : 'text-gray-300'}`}>
        {text}
      </p>
    </div>
  );
}

// NotIncluded Component
function NotIncluded({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <X className="w-3 h-3 text-gray-600 flex-shrink-0" />
      <span className="text-xs text-gray-500">{text}</span>
    </div>
  );
}

// Self-Funded Pricing Cards - Compact Design
function SelfFundedPricingCards({ 
  onCheckout, 
  isLoading,
  billingCycle,
  hoveredCard,
  setHoveredCard
}: { 
  onCheckout: (tier: 'self_funded' | 'search_fund', plan: 'early_bird' | 'standard', billing: 'monthly' | 'yearly') => void;
  isLoading: boolean;
  billingCycle: 'monthly' | 'yearly';
  hoveredCard: string | null;
  setHoveredCard: (card: string | null) => void;
}) {
  const monthlyPrice = 99;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.8);
  const displayPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
  const displayPeriod = billingCycle === 'monthly' ? 'month' : 'year';
  const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(yearlyPrice / 12) : monthlyPrice;
  
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
      {/* Self-Funded Card */}
      <div 
        className={`relative transition-all duration-300 ${
          hoveredCard === 'self-funded' ? 'scale-105 z-10' : 'scale-100'
        }`}
        onMouseEnter={() => setHoveredCard('self-funded')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border-2 border-emerald-500 p-5 transition-all ${
          hoveredCard === 'self-funded' ? 'shadow-emerald-500/50' : ''
        }`}>
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-white mb-1">
              Self-Funded Searcher
            </h3>
          </div>
          
          {/* Pricing - Compact */}
          <div className="text-center mb-4">
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-4xl font-bold text-white">${displayPrice}</span>
              <span className="text-sm text-gray-400">/{displayPeriod}</span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-xs text-emerald-400 mb-1">
                ${monthlyEquivalent}/mo billed annually
              </p>
            )}
          </div>
          
          {/* Key Features - Compact List with Checkmarks */}
          <div className="space-y-2 mb-4 text-left">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">20 CIM analyses/month</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">Unlimited pipeline tracking</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">5 IOI + 2 LOI/month</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">SBA 7(a) calculator</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">Chrome extension</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">1 user seat</span>
            </div>
          </div>
          
          {/* High-Contrast Free Trial Text - Above CTA */}
          <div className="mb-3 text-center">
            <p className="text-sm font-bold text-white bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              7-day free trial • $0 due today
            </p>
          </div>
          
          {/* Primary CTA - Free Trial */}
          <button
            onClick={() => onCheckout('self_funded', 'standard', billingCycle)}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-bold text-base hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            {isLoading ? 'Starting...' : 'Start Your Free Trial'}
          </button>
          
          {/* Micro-Copy: No-Surprise Policy */}
          <div className="mt-2 mb-2 px-2">
            <p className="text-xs text-gray-300 leading-relaxed text-center">
              Your trial is <span className="font-semibold text-emerald-400">100% free for 7 days</span>. We'll send you a reminder email on Day 6 before your subscription begins. Cancel with one click in your dashboard anytime.
            </p>
          </div>
          
          <p className="text-center text-xs text-gray-400">
            Cancel anytime
          </p>
          <p className="text-center text-xs text-gray-500 mt-1">
            Then ${displayPrice}/{displayPeriod}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

// Traditional Search Fund Pricing Cards - Compact Design
function TraditionalSearchFundPricingCards({ 
  onCheckout, 
  isLoading,
  billingCycle,
  hoveredCard,
  setHoveredCard
}: { 
  onCheckout: (tier: 'self_funded' | 'search_fund', plan: 'early_bird' | 'standard', billing: 'monthly' | 'yearly') => void;
  isLoading: boolean;
  billingCycle: 'monthly' | 'yearly';
  hoveredCard: string | null;
  setHoveredCard: (card: string | null) => void;
}) {
  const monthlyPrice = 149;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.8);
  const displayPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
  const displayPeriod = billingCycle === 'monthly' ? 'month' : 'year';
  const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(yearlyPrice / 12) : monthlyPrice;
  
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
      {/* Early Bird Card - Traditional Search Fund */}
      <div 
        className={`relative transition-all duration-300 ${
          hoveredCard === 'search-fund-early' ? 'scale-105 z-10' : 'scale-100'
        }`}
        onMouseEnter={() => setHoveredCard('search-fund-early')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        {/* Most Popular Badge */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-full text-xs font-bold shadow-lg shadow-emerald-500/50">
            <Crown className="w-4 h-4" />
            Most Popular
          </span>
        </div>
        
        {/* Early Bird Badge */}
        <div className="absolute -top-3 right-4 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500/90 to-cyan-500/90 text-white rounded-lg text-xs font-bold shadow-lg">
            <Zap className="w-3 h-3" />
            Early Bird Pricing
          </div>
        </div>
        
        <div className={`bg-gradient-to-br from-emerald-900/30 to-gray-900 rounded-xl shadow-2xl border-[3px] border-emerald-500 p-7 pt-12 transition-all relative ${
          hoveredCard === 'search-fund-early' ? 'shadow-emerald-500/50 ring-4 ring-emerald-500/30' : ''
        }`}>
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-emerald-500/20 rounded-xl blur-xl opacity-60 -z-10" />
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-white mb-1">
              Traditional Search Fund
            </h3>
            <p className="text-xs text-emerald-400 font-semibold mb-2">
              Lock in $149/mo forever
            </p>
          </div>
          
          {/* Pricing - Compact */}
          <div className="text-center mb-4">
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-5xl font-bold text-white">${displayPrice}</span>
              <span className="text-lg text-gray-400">/{displayPeriod}</span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-sm text-emerald-400 mb-1">
                ${monthlyEquivalent}/mo billed annually
              </p>
            )}
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold mb-2">
              <Zap className="w-3 h-3" />
              Locked forever
            </div>
            {/* Price Lock Notice */}
            <div className="mt-2">
              <p className="text-xs text-gray-400">
                Price increases to <span className="font-semibold text-red-400">$249/mo</span> on March 1
              </p>
              <p className="text-xs text-emerald-400 mt-1 font-semibold">
                Lock in $149/mo forever by signing up now
              </p>
            </div>
          </div>
          
          {/* Features Grid - Compact with Checkmarks */}
          <div className="grid grid-cols-2 gap-2 mb-4 text-left">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">UNLIMITED CIM analyses</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">UNLIMITED IOI/LOI</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">3 user seats</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">Investor dashboard</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">Team collaboration</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">Custom branding</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">Priority support</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">500 document storage</span>
            </div>
          </div>
          
          
          {/* High-Contrast Free Trial Text - Above CTA */}
          <div className="mb-3 text-center">
            <p className="text-sm font-bold text-white bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              7-day free trial • $0 due today
            </p>
          </div>
          
          {/* Primary CTA - Free Trial */}
          <button
            onClick={() => onCheckout('search_fund', 'early_bird', billingCycle)}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-bold text-base hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            {isLoading ? 'Starting...' : 'Start Your Free Trial'}
          </button>
          
          {/* Micro-Copy: No-Surprise Policy */}
          <div className="mt-2 mb-2 px-2">
            <p className="text-xs text-gray-300 leading-relaxed text-center">
              Your trial is <span className="font-semibold text-emerald-400">100% free for 7 days</span>. We'll send you a reminder email on Day 6 before your subscription begins. Cancel with one click in your dashboard anytime.
            </p>
          </div>
          
          <p className="text-center text-xs text-gray-400">
            Cancel anytime
          </p>
          <p className="text-center text-xs text-gray-500 mt-1">
            Then ${displayPrice}/{displayPeriod}
          </p>
        </div>
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
      q: "What's the difference between early bird and standard pricing?",
      a: "Early bird pricing is available for Traditional Search Fund plans only—lock in $149/month forever. Self-Funded plans are $99/month. All plans include a 7-day free trial."
    },
    {
      q: "Do I get a refund if I cancel?",
      a: "We offer a 30-day money-back guarantee. If you're not satisfied within the first 30 days, contact us for a full refund—no questions asked."
    },
    {
      q: "What happens if I hit my monthly limits?",
      a: "You'll get a notification when you're approaching your limits. You can upgrade to the Search Fund tier for unlimited usage, or wait until your next billing cycle when limits reset."
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
