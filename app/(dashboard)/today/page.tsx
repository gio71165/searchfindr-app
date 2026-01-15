'use client';

import { useTodayData } from './hooks/useTodayData';
import { AttentionCard } from '@/components/today/AttentionCard';
import { DealCard } from '@/components/ui/DealCard';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

export default function TodayPage() {
  const { 
    followUpsNeeded, 
    stuckDeals, 
    proceedWithoutAction,
    recentActivity,
    loading 
  } = useTodayData();

  if (loading) {
    return (
      <div className="p-8 space-y-6">
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {totalAttentionNeeded === 0 ? '✅ All caught up!' : `${totalAttentionNeeded} deals need attention`}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
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
              <div key={deal.id} className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <DealCard deal={deal} />
                <div className="mt-2 text-sm text-orange-600 dark:text-orange-400 font-medium">
                  ⏰ Due {deal.days_overdue && deal.days_overdue > 0 ? `${deal.days_overdue} days ago` : 'today'}
                </div>
                {deal.next_action && (
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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
              <div key={deal.id} className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <DealCard deal={deal} />
                <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                  📅 {deal.days_in_stage} days in reviewing
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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
              <div key={deal.id} className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <DealCard deal={deal} />
                <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Verdict: PROCEED • No next action set
                </div>
                <div className="mt-1">
                  <Link 
                    href={`/deals/${deal.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
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
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">You're all caught up!</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">No deals need immediate attention.</p>
          <Link 
            href="/dashboard"
            className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            View All Deals
          </Link>
        </div>
      )}

      {/* Recent Activity Feed */}
      {recentActivity.length > 0 && (
        <div className="border-t dark:border-gray-700 pt-8">
          <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.slice(0, 10).map(activity => (
              <div key={activity.id} className="flex gap-3 text-sm">
                <div className="text-gray-500 dark:text-gray-400 min-w-[100px]">
                  {activity.created_at ? new Date(activity.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  }) : 'Unknown date'}
                </div>
                <div className="flex-1">
                  <Link 
                    href={`/deals/${activity.deal_id}`}
                    className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {activity.company_name}
                  </Link>
                  <div className="text-gray-600 dark:text-gray-400">{activity.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
