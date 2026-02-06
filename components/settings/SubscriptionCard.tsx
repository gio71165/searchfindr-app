'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { AsyncButton } from '@/components/ui/AsyncButton';

export function SubscriptionCard() {
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  async function loadSubscription() {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setSubscription(profile);

      // Load usage - the API will authenticate via cookies
      try {
        const response = await fetch('/api/user/usage');
        
        if (response.ok) {
          const usageData = await response.json();
          setUsage(usageData);
        }
      } catch (error) {
        console.error('Error loading usage:', error);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  async function openBillingPortal() {
    if (!user) return;
    setPortalLoading(true);
    try {
      const response = await fetch('/api/checkout/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const { url, error } = await response.json();
      
      if (error) {
        alert(error);
        return;
      }
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('Failed to open billing portal. Please try again.');
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-sm p-6 border border-slate-700">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscription || subscription.subscription_status === 'inactive') {
    return (
      <div className="bg-slate-800 rounded-lg shadow-sm p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-50 mb-4">Subscription</h3>
        <p className="text-slate-400 mb-4">You don't have an active subscription.</p>
        <Link
          href="/pricing"
          className="btn-primary btn-lg inline-block"
        >
          View Plans
        </Link>
      </div>
    );
  }

  const isTrialing = subscription.subscription_status === 'trialing';

  return (
    <div className="bg-slate-800 rounded-lg shadow-sm p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-50">Subscription</h3>
        {isTrialing && (
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-sm font-semibold rounded-full border border-emerald-500/30">
            Trial Active
          </span>
        )}
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <p className="text-sm text-slate-400">Current Plan</p>
          <p className="text-lg font-semibold text-slate-50">
            {subscription.subscription_tier === 'self_funded' ? 'Self-Funded Searcher' : 'Traditional Search Fund'}
            {' '}(Early Bird)
          </p>
        </div>

        {isTrialing && subscription.trial_end_date && (
          <div>
            <p className="text-sm text-slate-400">Trial Ends</p>
            <p className="text-lg font-semibold text-slate-50">
              {new Date(subscription.trial_end_date).toLocaleDateString()}
            </p>
          </div>
        )}

        {!isTrialing && subscription.subscription_current_period_end && (
          <div>
            <p className="text-sm text-slate-400">Next Billing Date</p>
            <p className="text-lg font-semibold text-slate-50">
              {new Date(subscription.subscription_current_period_end).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Usage Display */}
      {usage && subscription.subscription_tier === 'self_funded' && (
        <div className="border-t border-slate-700 pt-6 mb-6">
          <h4 className="font-semibold text-slate-50 mb-4">Usage This Month</h4>
          
          <div className="space-y-3">
            <UsageBar
              label="CIM Analyses"
              used={usage.cim_analyses_used}
              limit={usage.cim_analyses_limit}
            />
            <UsageBar
              label="IOI Generations"
              used={usage.ioi_generations_used}
              limit={usage.ioi_generations_limit}
            />
            <UsageBar
              label="LOI Generations"
              used={usage.loi_generations_used}
              limit={usage.loi_generations_limit}
            />
          </div>
        </div>
      )}

      <AsyncButton
        onClick={openBillingPortal}
        isLoading={portalLoading}
        loadingText="Opening…"
        className="btn-primary btn-lg w-full"
      >
        Manage Subscription & Billing
      </AsyncButton>
      <p className="text-xs text-slate-500 mt-3 text-center">
        Opens Stripe billing portal where you can update payment methods, view invoices, and cancel your subscription
      </p>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  if (limit === null) {
    return (
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">{label}</span>
          <span className="font-semibold text-emerald-400">Unlimited</span>
        </div>
      </div>
    );
  }

  const percentage = (used / limit) * 100;
  const isNearLimit = percentage > 80;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400">{label}</span>
        <span className={`font-semibold ${isNearLimit ? 'text-amber-400' : 'text-slate-50'}`}>
          {used} / {limit}
        </span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
