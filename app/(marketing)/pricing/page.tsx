'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Zap, Users, Infinity, FileText, BarChart, Calculator, Chrome, Mail, MessageSquare, Palette, Headphones, Database, Crown, Video, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/supabaseClient';

export default function PricingPage() {
  const router = useRouter();
  const [searcherType, setSearcherType] = useState<'traditional' | 'self_funded'>('self_funded');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  async function handleCheckout(
    tier: 'self_funded' | 'search_fund',
    plan: 'early_bird',
    billingCycle: 'monthly' | 'yearly'
  ) {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push(`/signup?tier=${tier}&plan=${plan}&billing=${billingCycle}`);
        return;
      }
      
      router.push(`/checkout?tier=${tier}&plan=${plan}&billing=${billingCycle}`);
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f17]">
      {/* Urgency Banner - Top of Page */}
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border-b border-red-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-2 text-red-300 font-semibold">
              <AlertCircle className="w-5 h-5 animate-pulse" />
              <span className="text-lg">21/50 Early Bird Spots Filled</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-red-500/30" />
            <div className="flex items-center gap-2 text-orange-300 font-semibold">
              <Clock className="w-5 h-5" />
              <span className="text-lg">Early Bird Ends Feb 28, 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-gray-400 mb-6">
            Start your <span className="text-emerald-400 font-semibold">7-day free trial</span> • No credit card required
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
      
      {/* Final CTA Section */}
      <FinalCTA />
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
  onCheckout: (tier: 'self_funded' | 'search_fund', plan: 'early_bird', billing: 'monthly' | 'yearly') => void;
  isLoading: boolean;
  billingCycle: 'monthly' | 'yearly';
  hoveredCard: string | null;
  setHoveredCard: (card: string | null) => void;
}) {
  const monthlyPrice = 49;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.8);
  const displayPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
  const displayPeriod = billingCycle === 'monthly' ? 'month' : 'year';
  const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(yearlyPrice / 12) : monthlyPrice;
  
  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {/* Early Bird Card - Compact */}
      <div 
        className={`relative transition-all duration-300 ${
          hoveredCard === 'early-bird' ? 'scale-105 z-10' : 'scale-100'
        }`}
        onMouseEnter={() => setHoveredCard('early-bird')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        {/* Urgency Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full text-xs font-bold shadow-lg animate-pulse">
            <Zap className="w-3 h-3" />
            21/50 Spots Left
          </span>
        </div>
        
        <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border-2 border-emerald-500 p-5 pt-8 transition-all ${
          hoveredCard === 'early-bird' ? 'shadow-emerald-500/50' : ''
        }`}>
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-white mb-1">
              Early Bird
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Ends Feb 28, 2026
            </p>
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
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold">
              <Zap className="w-3 h-3" />
              Locked forever
            </div>
          </div>
          
          {/* Key Features - Compact List */}
          <div className="space-y-2 mb-4 text-left">
            <Feature icon={<FileText className="w-4 h-4" />} text="20 CIM analyses/month" />
            <Feature icon={<BarChart className="w-4 h-4" />} text="Unlimited pipeline tracking" />
            <Feature icon={<FileText className="w-4 h-4" />} text="5 IOI + 2 LOI/month" />
            <Feature icon={<Calculator className="w-4 h-4" />} text="SBA 7(a) calculator" />
            <Feature icon={<Chrome className="w-4 h-4" />} text="Chrome extension" />
            <Feature icon={<Users className="w-4 h-4" />} text="1 user seat" />
          </div>
          
          {/* Primary CTA - Free Trial */}
          <button
            onClick={() => onCheckout('self_funded', 'early_bird', billingCycle)}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-bold text-base hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            {isLoading ? 'Starting...' : 'Start Your Free Trial'}
          </button>
          
          <p className="text-center text-xs text-gray-400">
            <span className="font-semibold text-emerald-400">7-day free trial</span> • Cancel anytime
          </p>
          <p className="text-center text-xs text-gray-500 mt-1">
            Then ${displayPrice}/{displayPeriod}
          </p>
        </div>
      </div>
      
      {/* Post-Launch Card - Compact */}
      <div 
        className={`bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-5 opacity-90 transition-all duration-300 ${
          hoveredCard === 'post-launch' ? 'scale-105 opacity-100' : ''
        }`}
        onMouseEnter={() => setHoveredCard('post-launch')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-white mb-1">
            Post-Launch
          </h3>
          <p className="text-xs text-gray-400">
            After Feb 28, 2026
          </p>
        </div>
        
        <div className="text-center mb-4">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-4xl font-bold text-gray-300">$79</span>
            <span className="text-sm text-gray-400">/month</span>
          </div>
          <p className="text-xs text-gray-500">
            Same features
          </p>
        </div>
        
        <div className="space-y-2 mb-4 text-left">
          <Feature icon={<FileText className="w-4 h-4" />} text="20 CIM analyses/month" muted />
          <Feature icon={<BarChart className="w-4 h-4" />} text="Unlimited pipeline tracking" muted />
          <Feature icon={<FileText className="w-4 h-4" />} text="5 IOI + 2 LOI/month" muted />
          <Feature icon={<Calculator className="w-4 h-4" />} text="SBA 7(a) calculator" muted />
          <Feature icon={<Chrome className="w-4 h-4" />} text="Chrome extension" muted />
          <Feature icon={<Users className="w-4 h-4" />} text="1 user seat" muted />
        </div>
        
        <button
          disabled
          className="w-full py-3 bg-gray-700 text-gray-400 rounded-lg font-bold text-base cursor-not-allowed mb-2"
        >
          Available After Launch
        </button>
        
        <p className="text-center text-xs text-gray-500">
          Lock in $49/mo now →
        </p>
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
  onCheckout: (tier: 'self_funded' | 'search_fund', plan: 'early_bird', billing: 'monthly' | 'yearly') => void;
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
  
  const postLaunchStandardMonthly = 249;
  const postLaunchStandardYearly = Math.round(postLaunchStandardMonthly * 12 * 0.8);
  const postLaunchStandardPrice = billingCycle === 'monthly' ? postLaunchStandardMonthly : postLaunchStandardYearly;
  const postLaunchStandardMonthlyEquivalent = billingCycle === 'yearly' ? Math.round(postLaunchStandardYearly / 12) : postLaunchStandardMonthly;
  
  const postLaunchUnlimitedMonthly = 369;
  const postLaunchUnlimitedYearly = Math.round(postLaunchUnlimitedMonthly * 12 * 0.8);
  const postLaunchUnlimitedPrice = billingCycle === 'monthly' ? postLaunchUnlimitedMonthly : postLaunchUnlimitedYearly;
  const postLaunchUnlimitedMonthlyEquivalent = billingCycle === 'yearly' ? Math.round(postLaunchUnlimitedYearly / 12) : postLaunchUnlimitedMonthly;
  
  return (
    <div className="grid md:grid-cols-3 gap-4 max-w-7xl mx-auto">
      {/* Early Bird Card - Compact */}
      <div 
        className={`relative transition-all duration-300 ${
          hoveredCard === 'search-fund-early' ? 'scale-105 z-10' : 'scale-100'
        }`}
        onMouseEnter={() => setHoveredCard('search-fund-early')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        {/* Urgency Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full text-xs font-bold shadow-lg animate-pulse">
            <Crown className="w-3 h-3" />
            21/50 Founder Spots Left
          </span>
        </div>
        
        <div className={`bg-gradient-to-br from-emerald-900/30 to-gray-900 rounded-xl shadow-2xl border-2 border-emerald-500 p-6 pt-10 transition-all ${
          hoveredCard === 'search-fund-early' ? 'shadow-emerald-500/50' : ''
        }`}>
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-white mb-1">
              Early Bird - Unlimited
            </h3>
            <p className="text-xs text-emerald-400 font-semibold mb-2">
              Ends Feb 28, 2026 • Limited to first 50 search funds
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
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold">
              <Zap className="w-3 h-3" />
              Locked forever
            </div>
            <p className="text-xs text-gray-500 mt-1">
              vs. {billingCycle === 'monthly' ? '$369/month' : '$3,540/year'} post-launch
            </p>
          </div>
          
          {/* Features Grid - Compact */}
          <div className="grid grid-cols-2 gap-2 mb-4 text-left">
            <Feature icon={<Infinity className="w-4 h-4" />} text="UNLIMITED CIM analyses" highlight />
            <Feature icon={<Infinity className="w-4 h-4" />} text="UNLIMITED IOI/LOI" highlight />
            <Feature icon={<Users className="w-4 h-4" />} text="3 user seats" highlight />
            <Feature icon={<BarChart className="w-4 h-4" />} text="Investor dashboard" highlight />
            <Feature icon={<MessageSquare className="w-4 h-4" />} text="Team collaboration" highlight />
            <Feature icon={<Palette className="w-4 h-4" />} text="Custom branding" highlight />
            <Feature icon={<Headphones className="w-4 h-4" />} text="Priority support" highlight />
            <Feature icon={<Database className="w-4 h-4" />} text="500 document storage" highlight />
          </div>
          
          {/* Founder Benefits - Compact */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 mb-4">
            <h4 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Founder Exclusives:
            </h4>
            <div className="grid grid-cols-2 gap-1 text-xs text-white/90">
              <div className="flex items-center gap-1">
                <Video className="w-3 h-3 text-emerald-400" />
                <span>Monthly calls with Gio</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Priority feature requests</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" />
                <span>Private community</span>
              </div>
              <div className="flex items-center gap-1">
                <Crown className="w-3 h-3 text-emerald-400" />
                <span>Lifetime pricing</span>
              </div>
            </div>
          </div>
          
          {/* Primary CTA - Free Trial */}
          <button
            onClick={() => onCheckout('search_fund', 'early_bird', billingCycle)}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-bold text-base hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            {isLoading ? 'Starting...' : 'Start Your Free Trial'}
          </button>
          
          <p className="text-center text-xs text-gray-400">
            <span className="font-semibold text-emerald-400">7-day free trial</span> • Cancel anytime
          </p>
          <p className="text-center text-xs text-gray-500 mt-1">
            Then ${displayPrice}/{displayPeriod} + Founder Access
          </p>
        </div>
      </div>
      
      {/* Post-Launch Standard - With Limits */}
      <div 
        className={`bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-5 opacity-90 transition-all duration-300 ${
          hoveredCard === 'search-fund-standard' ? 'scale-105 opacity-100' : ''
        }`}
        onMouseEnter={() => setHoveredCard('search-fund-standard')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-white mb-1">
            Post-Launch Standard
          </h3>
          <p className="text-xs text-gray-400">
            After Feb 28, 2026
          </p>
        </div>
        
        <div className="text-center mb-4">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-4xl font-bold text-gray-300">${postLaunchStandardPrice}</span>
            <span className="text-sm text-gray-400">/{displayPeriod}</span>
          </div>
          {billingCycle === 'yearly' && (
            <p className="text-xs text-gray-400 mb-1">
              ${postLaunchStandardMonthlyEquivalent}/mo billed annually
            </p>
          )}
          <p className="text-xs text-red-400 font-semibold mt-1">
            ${postLaunchStandardPrice - displayPrice} more than early bird
          </p>
        </div>
        
        <div className="space-y-2 mb-4 text-left">
          <Feature icon={<FileText className="w-4 h-4" />} text="20 CIM analyses/month" muted />
          <Feature icon={<FileText className="w-4 h-4" />} text="5 IOI + 2 LOI/month" muted />
          <Feature icon={<Users className="w-4 h-4" />} text="3 user seats" muted />
          <Feature icon={<BarChart className="w-4 h-4" />} text="Investor dashboard" muted />
          <Feature icon={<MessageSquare className="w-4 h-4" />} text="Team collaboration" muted />
          <Feature icon={<Palette className="w-4 h-4" />} text="Custom branding" muted />
          <Feature icon={<Headphones className="w-4 h-4" />} text="Priority support" muted />
          <Feature icon={<Database className="w-4 h-4" />} text="500 document storage" muted />
        </div>
        
        <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-400 mb-1 font-semibold">Not included:</p>
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-1">
              <X className="w-3 h-3" />
              <span>Unlimited CIM/IOI/LOI</span>
            </div>
            <div className="flex items-center gap-1">
              <X className="w-3 h-3" />
              <span>Monthly calls with founder</span>
            </div>
            <div className="flex items-center gap-1">
              <X className="w-3 h-3" />
              <span>Priority feature requests</span>
            </div>
            <div className="flex items-center gap-1">
              <X className="w-3 h-3" />
              <span>Private founder community</span>
            </div>
          </div>
        </div>
        
        <button
          disabled
          className="w-full py-3 bg-gray-700 text-gray-400 rounded-lg font-bold text-base cursor-not-allowed mb-2"
        >
          Available After Launch
        </button>
        
        <p className="text-center text-xs text-gray-500">
          Lock in $149/mo now →
        </p>
      </div>
      
      {/* Post-Launch Unlimited */}
      <div 
        className={`bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-5 opacity-90 transition-all duration-300 ${
          hoveredCard === 'search-fund-unlimited' ? 'scale-105 opacity-100' : ''
        }`}
        onMouseEnter={() => setHoveredCard('search-fund-unlimited')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-white mb-1">
            Post-Launch Unlimited
          </h3>
          <p className="text-xs text-gray-400">
            After Feb 28, 2026
          </p>
        </div>
        
        <div className="text-center mb-4">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-4xl font-bold text-gray-300">${postLaunchUnlimitedPrice}</span>
            <span className="text-sm text-gray-400">/{displayPeriod}</span>
          </div>
          {billingCycle === 'yearly' && (
            <p className="text-xs text-gray-400 mb-1">
              ${postLaunchUnlimitedMonthlyEquivalent}/mo billed annually
            </p>
          )}
          <p className="text-xs text-red-400 font-semibold mt-1">
            ${postLaunchUnlimitedPrice - displayPrice} more than early bird
          </p>
        </div>
        
        <div className="space-y-2 mb-4 text-left">
          <Feature icon={<Infinity className="w-4 h-4" />} text="UNLIMITED CIM analyses" muted />
          <Feature icon={<Infinity className="w-4 h-4" />} text="UNLIMITED IOI/LOI" muted />
          <Feature icon={<Users className="w-4 h-4" />} text="3 user seats" muted />
          <Feature icon={<BarChart className="w-4 h-4" />} text="Investor dashboard" muted />
          <Feature icon={<MessageSquare className="w-4 h-4" />} text="Team collaboration" muted />
          <Feature icon={<Palette className="w-4 h-4" />} text="Custom branding" muted />
          <Feature icon={<Headphones className="w-4 h-4" />} text="Priority support" muted />
          <Feature icon={<Database className="w-4 h-4" />} text="500 document storage" muted />
        </div>
        
        <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-400 mb-1 font-semibold">Not included:</p>
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-1">
              <X className="w-3 h-3" />
              <span>Monthly calls with founder</span>
            </div>
            <div className="flex items-center gap-1">
              <X className="w-3 h-3" />
              <span>Priority feature requests</span>
            </div>
            <div className="flex items-center gap-1">
              <X className="w-3 h-3" />
              <span>Private founder community</span>
            </div>
          </div>
        </div>
        
        <button
          disabled
          className="w-full py-3 bg-gray-700 text-gray-400 rounded-lg font-bold text-base cursor-not-allowed mb-2"
        >
          Available After Launch
        </button>
        
        <p className="text-center text-xs text-gray-500">
          Lock in $149/mo now →
        </p>
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
      q: "What's the difference between early bird and post-launch pricing?",
      a: "Early bird pricing locks in forever—you'll pay $49/month (self-funded) or $149/month (search fund) for life, even as prices increase for new customers. Traditional search fund early birds also get monthly 1-on-1 calls with Gio and access to the private founder community."
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
          Join 21+ early bird founders already using SearchFindr
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
