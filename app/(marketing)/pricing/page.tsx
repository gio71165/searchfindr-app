'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Zap, Users, Infinity, FileText, BarChart, Calculator, Chrome, Mail, MessageSquare, Palette, Headphones, Database, Crown, Video } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/supabaseClient';

export default function PricingPage() {
  const router = useRouter();
  const [searcherType, setSearcherType] = useState<'traditional' | 'self_funded'>('self_funded');
  const [isLoading, setIsLoading] = useState(false);

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
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          plan,
          billingCycle,
          userId: user.id,
          email: user.email,
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }
      
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f17]">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-400">
            Choose the plan that fits your search journey
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex items-center justify-center mb-16">
          <div className="inline-flex rounded-xl border border-gray-700 p-1.5 bg-gray-900 w-full sm:w-auto">
            <button
              onClick={() => setSearcherType('self_funded')}
              className={`px-4 sm:px-8 py-4 rounded-lg text-base font-semibold transition-all flex-1 sm:flex-none ${
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
              className={`px-4 sm:px-8 py-4 rounded-lg text-base font-semibold transition-all flex-1 sm:flex-none ${
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
        </div>
        
        {/* Pricing Cards */}
        {searcherType === 'self_funded' ? (
          <SelfFundedPricingCards />
        ) : (
          <TraditionalSearchFundPricingCards />
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
    <div className="flex items-start gap-3">
      <div className={`flex-shrink-0 mt-0.5 ${muted ? 'text-gray-500' : highlight ? 'text-emerald-400' : 'text-emerald-500'}`}>
        {icon}
      </div>
      <p className={`text-sm ${muted ? 'text-gray-500' : highlight ? 'text-emerald-400 font-semibold' : 'text-gray-300'}`}>
        {text}
      </p>
    </div>
  );
}

// NotIncluded Component
function NotIncluded({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <X className="w-4 h-4 text-gray-600 flex-shrink-0" />
      <span className="text-xs text-gray-500">{text}</span>
    </div>
  );
}

// Self-Funded Pricing Cards
function SelfFundedPricingCards() {
  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
      {/* Early Bird Card - HIGHLIGHTED */}
      <div className="relative">
        {/* "Best Value" Badge */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-bold shadow-lg">
            <Zap className="w-4 h-4" />
            Best Value - Lock In Now
          </span>
        </div>
        
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border-2 border-emerald-500 p-6 sm:p-8 pt-12 h-full">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">
              Early Bird Pricing
            </h3>
            <p className="text-gray-400 text-sm">
              Limited spots available
            </p>
          </div>
          
          {/* Pricing */}
          <div className="text-center mb-8">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-5xl sm:text-6xl font-bold text-white">$49</span>
              <span className="text-xl text-gray-400">/month</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-semibold mt-2">
              <Zap className="w-3 h-3" />
              Locked in forever
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Regular price: $79/month
            </p>
          </div>
          
          {/* Features */}
          <div className="space-y-3 mb-8">
            <Feature icon={<FileText className="w-5 h-5" />} text="20 CIM analyses/month" />
            <Feature icon={<BarChart className="w-5 h-5" />} text="Unlimited pipeline tracking" />
            <Feature icon={<FileText className="w-5 h-5" />} text="5 IOI generations/month" />
            <Feature icon={<FileText className="w-5 h-5" />} text="2 LOI generations/month" />
            <Feature icon={<Calculator className="w-5 h-5" />} text="SBA 7(a) calculator" />
            <Feature icon={<Chrome className="w-5 h-5" />} text="Chrome extension" />
            <Feature icon={<Users className="w-5 h-5" />} text="1 user seat" />
            <Feature icon={<Mail className="w-5 h-5" />} text="Email support (24-48hr)" />
          </div>
          
          {/* What's Not Included */}
          <div className="border-t border-gray-700 pt-6 mb-8">
            <p className="text-xs text-gray-500 mb-3 font-semibold">Not included:</p>
            <div className="space-y-2">
              <NotIncluded text="Unlimited CIM analyses" />
              <NotIncluded text="Team collaboration" />
              <NotIncluded text="Investor dashboard" />
              <NotIncluded text="Custom branding" />
            </div>
          </div>
          
          {/* CTA */}
          <button
            onClick={() => handleCheckout('self_funded', 'early_bird', 'monthly')}
            disabled={isLoading}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Starting checkout...' : 'Lock In $49/Month Forever'}
          </button>
          
          <p className="text-center text-sm text-gray-400 mt-4">
            <span className="font-semibold text-emerald-400">7-day free trial</span> • No commitment • Cancel anytime
          </p>
        </div>
      </div>
      
      {/* Post-Launch Card */}
      <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6 sm:p-8 h-full opacity-90">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-white mb-2">
            Post-Launch Pricing
          </h3>
          <p className="text-gray-400 text-sm">
            After early access ends
          </p>
        </div>
        
        {/* Pricing */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-5xl sm:text-6xl font-bold text-gray-300">$79</span>
            <span className="text-xl text-gray-400">/month</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Same features as early bird
          </p>
        </div>
        
        {/* Features (Same as Early Bird) */}
        <div className="space-y-3 mb-8">
          <Feature icon={<FileText className="w-5 h-5" />} text="20 CIM analyses/month" muted />
          <Feature icon={<BarChart className="w-5 h-5" />} text="Unlimited pipeline tracking" muted />
          <Feature icon={<FileText className="w-5 h-5" />} text="5 IOI generations/month" muted />
          <Feature icon={<FileText className="w-5 h-5" />} text="2 LOI generations/month" muted />
          <Feature icon={<Calculator className="w-5 h-5" />} text="SBA 7(a) calculator" muted />
          <Feature icon={<Chrome className="w-5 h-5" />} text="Chrome extension" muted />
          <Feature icon={<Users className="w-5 h-5" />} text="1 user seat" muted />
          <Feature icon={<Mail className="w-5 h-5" />} text="Email support (24-48hr)" muted />
        </div>
        
        {/* What's Not Included */}
        <div className="border-t border-gray-700 pt-6 mb-8">
          <p className="text-xs text-gray-500 mb-3 font-semibold">Not included:</p>
          <div className="space-y-2">
            <NotIncluded text="Unlimited CIM analyses" />
            <NotIncluded text="Team collaboration" />
            <NotIncluded text="Investor dashboard" />
            <NotIncluded text="Custom branding" />
          </div>
        </div>
        
        {/* CTA (Disabled/Muted) */}
        <button
          disabled
          className="w-full py-4 bg-gray-700 text-gray-400 rounded-xl font-bold text-lg cursor-not-allowed"
        >
          Available After Launch
        </button>
        
        <p className="text-center text-xs text-gray-500 mt-4">
          Lock in $49/mo by signing up now →
        </p>
      </div>
    </div>
  );
}

// Traditional Search Fund Pricing Cards
function TraditionalSearchFundPricingCards() {
  return (
    <>
      {/* Early Bird Section */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Early Bird Access</h2>
          <p className="text-gray-400">Founder-level benefits for early supporters</p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          {/* Single Early Bird Card - Full Width, Highlighted */}
          <div className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full text-sm font-bold shadow-lg">
                <Crown className="w-4 h-4" />
                Founder Priority Access
              </span>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-900/20 to-gray-900 rounded-2xl shadow-2xl border-2 border-emerald-500 p-8 sm:p-10 pt-14">
              <div className="text-center mb-8">
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Early Bird - Unlimited
                </h3>
                <p className="text-emerald-400 text-sm font-semibold">
                  Limited to first 50 search funds
                </p>
              </div>
              
              {/* Pricing */}
              <div className="text-center mb-10">
                <div className="flex items-baseline justify-center gap-2 mb-3">
                  <span className="text-6xl sm:text-7xl font-bold text-white">$149</span>
                  <span className="text-2xl text-gray-400">/month</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-base font-semibold">
                  <Zap className="w-4 h-4" />
                  Locked in forever
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  vs. $369/month post-launch for same features
                </p>
              </div>
              
              {/* Two Column Features */}
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 mb-10">
                <Feature icon={<Infinity className="w-5 h-5" />} text="UNLIMITED CIM analyses" highlight />
                <Feature icon={<Infinity className="w-5 h-5" />} text="UNLIMITED IOI/LOI generation" highlight />
                <Feature icon={<Users className="w-5 h-5" />} text="3 user seats" highlight />
                <Feature icon={<BarChart className="w-5 h-5" />} text="Investor dashboard (1 LP portal)" highlight />
                <Feature icon={<MessageSquare className="w-5 h-5" />} text="Team collaboration" highlight />
                <Feature icon={<Palette className="w-5 h-5" />} text="Custom branding" highlight />
                <Feature icon={<Headphones className="w-5 h-5" />} text="Priority support" highlight />
                <Feature icon={<Database className="w-5 h-5" />} text="500 document storage" highlight />
              </div>
              
              {/* Founder Benefits */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 mb-8">
                <h4 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Exclusive Founder Benefits:
                </h4>
                <div className="space-y-3">
                  <Feature 
                    icon={<Video className="w-5 h-5" />} 
                    text="Monthly 1-on-1 calls with founder (Gio)" 
                    highlight 
                  />
                  <Feature 
                    icon={<Zap className="w-5 h-5" />} 
                    text="Priority feature requests" 
                    highlight 
                  />
                  <Feature 
                    icon={<Users className="w-5 h-5" />} 
                    text="Private founder community access" 
                    highlight 
                  />
                  <Feature 
                    icon={<Crown className="w-5 h-5" />} 
                    text="Lifetime grandfathered pricing" 
                    highlight 
                  />
                </div>
              </div>
              
              {/* CTA */}
              <button
                onClick={() => handleCheckout('search_fund', 'early_bird', 'monthly')}
                disabled={isLoading}
                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Starting checkout...' : 'Lock In $149/Month + Founder Access'}
              </button>
              
              <p className="text-center text-sm text-gray-400 mt-4">
                <span className="font-semibold text-emerald-400">7-day free trial</span> • No commitment • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Post-Launch Section */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Post-Launch Pricing</h2>
          <p className="text-gray-400">Available after early access ends</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Standard Tier */}
          <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6 sm:p-8 opacity-90">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                Standard
              </h3>
              <p className="text-gray-400 text-sm">
                For active search funds
              </p>
            </div>
            
            {/* Pricing */}
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-5xl sm:text-6xl font-bold text-gray-300">$249</span>
                <span className="text-xl text-gray-400">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                With monthly limits
              </p>
            </div>
            
            {/* Features */}
            <div className="space-y-3 mb-8">
              <Feature icon={<FileText className="w-5 h-5" />} text="50 CIM analyses/month" muted />
              <Feature icon={<FileText className="w-5 h-5" />} text="15 IOI generations/month" muted />
              <Feature icon={<FileText className="w-5 h-5" />} text="5 LOI generations/month" muted />
              <Feature icon={<Users className="w-5 h-5" />} text="3 user seats" muted />
              <Feature icon={<BarChart className="w-5 h-5" />} text="Investor dashboard" muted />
              <Feature icon={<MessageSquare className="w-5 h-5" />} text="Team collaboration" muted />
              <Feature icon={<Palette className="w-5 h-5" />} text="Custom branding" muted />
              <Feature icon={<Headphones className="w-5 h-5" />} text="Priority support" muted />
            </div>
            
            {/* What's Not Included */}
            <div className="border-t border-gray-700 pt-6 mb-8">
              <p className="text-xs text-gray-500 mb-3 font-semibold">Not included:</p>
              <div className="space-y-2">
                <NotIncluded text="Unlimited analyses" />
                <NotIncluded text="Founder 1-on-1 calls" />
                <NotIncluded text="Founder community" />
              </div>
            </div>
            
            {/* CTA */}
            <button
              disabled
              className="w-full py-4 bg-gray-700 text-gray-400 rounded-xl font-bold text-lg cursor-not-allowed"
            >
              Available After Launch
            </button>
          </div>
          
          {/* Unlimited Tier */}
          <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6 sm:p-8 opacity-90">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                Unlimited
              </h3>
              <p className="text-gray-400 text-sm">
                No limits on usage
              </p>
            </div>
            
            {/* Pricing */}
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-5xl sm:text-6xl font-bold text-gray-300">$369</span>
                <span className="text-xl text-gray-400">/month</span>
              </div>
              <p className="text-sm text-emerald-400 font-semibold mt-2">
                Save $220/mo with early bird →
              </p>
            </div>
            
            {/* Features */}
            <div className="space-y-3 mb-8">
              <Feature icon={<Infinity className="w-5 h-5" />} text="UNLIMITED CIM analyses" muted />
              <Feature icon={<Infinity className="w-5 h-5" />} text="UNLIMITED IOI/LOI generation" muted />
              <Feature icon={<Users className="w-5 h-5" />} text="3 user seats" muted />
              <Feature icon={<BarChart className="w-5 h-5" />} text="Investor dashboard" muted />
              <Feature icon={<MessageSquare className="w-5 h-5" />} text="Team collaboration" muted />
              <Feature icon={<Palette className="w-5 h-5" />} text="Custom branding" muted />
              <Feature icon={<Headphones className="w-5 h-5" />} text="Priority support" muted />
              <Feature icon={<Database className="w-5 h-5" />} text="Unlimited storage" muted />
            </div>
            
            {/* What's Not Included */}
            <div className="border-t border-gray-700 pt-6 mb-8">
              <p className="text-xs text-gray-500 mb-3 font-semibold">Not included:</p>
              <div className="space-y-2">
                <NotIncluded text="Founder 1-on-1 calls" />
                <NotIncluded text="Founder community access" />
                <NotIncluded text="Lifetime price lock" />
              </div>
            </div>
            
            {/* CTA */}
            <button
              disabled
              className="w-full py-4 bg-gray-700 text-gray-400 rounded-xl font-bold text-lg cursor-not-allowed"
            >
              Available After Launch
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// FAQ Section
function FAQSection() {
  const faqs = [
    {
      q: "Why should I sign up for early bird pricing?",
      a: "Early bird pricing locks in forever—you'll pay $49/month (self-funded) or $149/month (search fund) for life, even as prices increase for new customers. Traditional search fund early birds also get monthly 1-on-1 calls with Gio and access to the private founder community."
    },
    {
      q: "What's the difference between Self-Funded and Traditional Search Fund?",
      a: "Self-Funded is for solo searchers bootstrapping without investor capital (20 CIMs/month, 1 user). Traditional Search Fund is for searchers who raised capital (unlimited CIMs, 3 users, investor dashboard, team features)."
    },
    {
      q: "Can I upgrade from Self-Funded to Traditional later?",
      a: "Yes! Upgrade anytime and pay the prorated difference. If you're on early bird self-funded ($49) and upgrade to traditional, you'll get the early bird traditional rate ($149) if spots are still available."
    },
    {
      q: "What are the 'Founder Benefits' for early bird traditional search funds?",
      a: "You get monthly 1-on-1 strategy calls with Gio (the founder), priority on feature requests, access to a private community of other early search funds, and lifetime price lock at $149/month."
    },
    {
      q: "How many early bird spots are available?",
      a: "We're limiting early bird traditional search fund pricing to 50 spots to ensure we can deliver on the 1-on-1 founder calls. Self-funded early bird has more availability but pricing will increase to $79/month after launch."
    },
    {
      q: "What happens if I hit my monthly limits on Self-Funded tier?",
      a: "You can purchase additional analyses ($5/CIM) or upgrade to Traditional Search Fund for unlimited. We'll email you when you're at 15/20 CIMs so you're never surprised."
    },
    {
      q: "Do you offer annual pricing?",
      a: "Yes! Annual pricing saves 17%: Self-Funded Early Bird = $490/year ($49×10), Traditional Early Bird = $1,490/year ($149×10). Pay for 10 months, get 12."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes, cancel anytime from settings. No questions, no hassle. Your access continues until the end of your billing period."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-20 border-t border-gray-800">
      <h2 className="text-4xl font-bold text-white text-center mb-12">
        Frequently Asked Questions
      </h2>
      <div className="space-y-6">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">
              {faq.q}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Final CTA Section
function FinalCTA() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <h2 className="text-4xl font-bold text-white mb-4">
        Ready to review deals 10x faster?
      </h2>
      <p className="text-xl text-gray-400 mb-8">
        Join the search fund operators who are saving 40+ hours per month
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/signup?tier=self_funded&pricing=early_bird"
          className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/50"
        >
          Start at $49/Month
        </Link>
        <Link
          href="/sample-analysis"
          className="px-8 py-4 bg-gray-800 text-white rounded-xl font-bold text-lg hover:bg-gray-700 transition-all border border-gray-700"
        >
          See Sample Analysis
        </Link>
      </div>
      <p className="text-sm text-gray-500 mt-6">
        7-day free trial • No credit card required • Early bird pricing ends soon
      </p>
    </div>
  );
}
