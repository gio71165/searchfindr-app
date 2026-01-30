'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTodayData } from './hooks/useTodayData';
import { useAuth } from '@/lib/auth-context';
import { AttentionCard } from '@/components/today/AttentionCard';
import { DealCard } from '@/components/ui/DealCard';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

export default function TodayPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    followUpsNeeded,
    stuckDeals,
    proceedWithoutAction,
    recentActivity,
    loading
  } = useTodayData();

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/');
  }, [authLoading, user, router]);

  if (authLoading || loading || (!user && !authLoading)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-x-hidden">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const totalAttentionNeeded = 
    followUpsNeeded.length + 
    stuckDeals.length + 
    proceedWithoutAction.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 sm:space-y-8">
      {/* Hero Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {totalAttentionNeeded === 0 ? '✅ All caught up!' : `${totalAttentionNeeded} deals need attention`}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Follow-ups Due */}
      {followUpsNeeded.length > 0 && (
        <AttentionCard
          title="Follow-ups Due"
          count={followUpsNeeded.length}
          variant="urgent"
          icon="🔔"
        >
          <div className="space-y-3">
            {followUpsNeeded.map(deal => (
              <div key={deal.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                <DealCard deal={deal} />
                <div className="mt-2 text-sm text-amber-600 font-medium">
                  ⏰ Due {deal.days_overdue && deal.days_overdue > 0 ? `${deal.days_overdue} days ago` : 'today'}
                </div>
                {deal.next_action && (
                  <div className="mt-1 text-sm text-slate-600">
                    Next: {deal.next_action}
                  </div>
                )}
              </div>
            ))}
          </div>
        </AttentionCard>
      )}

      {/* Deals Stuck in Reviewing */}
      {stuckDeals.length > 0 && (
        <AttentionCard
          title="Stuck in Review"
          count={stuckDeals.length}
          variant="warning"
          icon="⚠️"
        >
          <div className="space-y-3">
            {stuckDeals.map(deal => (
              <div key={deal.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                <DealCard deal={deal} />
                <div className="mt-2 text-sm text-amber-600 font-medium">
                  📅 {deal.days_in_stage} days in reviewing
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Make a decision: Proceed or Pass?
                </div>
              </div>
            ))}
          </div>
        </AttentionCard>
      )}

      {/* Proceed Deals Without Next Action */}
      {proceedWithoutAction.length > 0 && (
        <AttentionCard
          title="Proceed Deals Missing Next Step"
          count={proceedWithoutAction.length}
          variant="info"
          icon="📋"
        >
          <div className="space-y-3">
            {proceedWithoutAction.map(deal => (
              <div key={deal.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                <DealCard deal={deal} />
                <div className="mt-2 text-sm text-blue-600 font-medium">
                  Verdict: PROCEED • No next action set
                </div>
                <div className="mt-1">
                  <Link 
                    href={`/deals/${deal.id}`}
                    className="inline-block text-sm text-blue-600 hover:underline min-h-[44px] py-2 touch-manipulation"
                  >
                    Set next action →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </AttentionCard>
      )}

      {/* All Clear State */}
      {totalAttentionNeeded === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-semibold text-slate-900">You're all caught up!</h2>
          <p className="text-slate-600 mt-2">No deals need immediate attention.</p>
          <Link 
            href="/dashboard"
            className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Deals
          </Link>
        </div>
      )}

      {/* Recent Activity Feed */}
      {recentActivity.length > 0 && (
        <div className="border-t border-slate-200 pt-6 sm:pt-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-slate-900">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.slice(0, 10).map(activity => (
              <div key={activity.id} className="flex flex-col sm:flex-row gap-2 sm:gap-3 text-sm">
                <div className="text-slate-500 sm:min-w-[100px]">
                  {activity.created_at ? new Date(activity.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  }) : 'Unknown date'}
                </div>
                <div className="flex-1 min-w-0">
                  <Link 
                    href={`/deals/${activity.deal_id}`}
                    className="font-medium text-slate-900 hover:text-emerald-600 block min-h-[44px] py-2 touch-manipulation"
                  >
                    {activity.company_name}
                  </Link>
                  <div className="text-slate-600 break-words">{activity.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
