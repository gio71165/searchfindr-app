'use client';

import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, FileText, MessageSquare, ArrowRight, Calendar } from 'lucide-react';
import type { DealActivity } from '@/lib/types/deal';
import { supabase } from '@/app/supabaseClient';
import { Skeleton } from '@/components/ui/Skeleton';

interface DealActivityTimelineProps {
  dealId: string;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  stage_change: <ArrowRight className="h-4 w-4" />,
  verdict_set: <CheckCircle className="h-4 w-4" />,
  note: <MessageSquare className="h-4 w-4" />,
  ioi_sent: <FileText className="h-4 w-4" />,
  call_scheduled: <Calendar className="h-4 w-4" />,
  cim_analyzed: <FileText className="h-4 w-4" />,
  passed: <XCircle className="h-4 w-4" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  stage_change: 'text-blue-600 bg-blue-50',
  verdict_set: 'text-emerald-600 bg-emerald-50',
  note: 'text-slate-600 bg-slate-50',
  ioi_sent: 'text-purple-600 bg-purple-50',
  call_scheduled: 'text-amber-600 bg-amber-50',
  cim_analyzed: 'text-indigo-600 bg-indigo-50',
  passed: 'text-red-600 bg-red-50',
};

export function DealActivityTimeline({ dealId }: DealActivityTimelineProps) {
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          setError('Not signed in');
          return;
        }

        const response = await fetch(`/api/deals/${dealId}/activities?limit=50`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load activities');
        }

        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load activities');
      } finally {
        setLoading(false);
      }
    };

    if (dealId) {
      fetchActivities();
    }
  }, [dealId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton height={60} />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="text-sm font-semibold">Error loading timeline</p>
        <p className="text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
        <p className="text-xs mt-1">Activity will appear here as you interact with this deal</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Activity Timeline</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
        
        <div className="space-y-6">
          {activities.map((activity, index) => {
            const icon = ACTIVITY_ICONS[activity.activity_type] || <Clock className="h-4 w-4" />;
            const colorClass = ACTIVITY_COLORS[activity.activity_type] || 'text-slate-600 bg-slate-50';
            const isLast = index === activities.length - 1;

            return (
              <div key={activity.id} className="relative flex items-start gap-4">
                {/* Icon */}
                <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${colorClass} flex items-center justify-center`}>
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <p className="text-sm text-slate-900 font-medium">{activity.description}</p>
                    <div className="flex-shrink-0 text-xs text-slate-500">
                      <div>{formatDate(activity.created_at || '')}</div>
                      <div>{formatTime(activity.created_at || '')}</div>
                    </div>
                  </div>
                  
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (() => {
                    const meta = activity.metadata as Record<string, any>;
                    return (
                      <div className="mt-2 text-xs text-slate-600">
                        {activity.activity_type === 'stage_change' && meta.old_stage && meta.new_stage && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded">
                            <span className="text-slate-500">{String(meta.old_stage)}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-medium">{String(meta.new_stage)}</span>
                          </span>
                        )}
                        {activity.activity_type === 'verdict_set' && meta.verdict && (
                          <span className="inline-flex items-center px-2 py-1 bg-slate-100 rounded">
                            Verdict: <span className="font-medium ml-1">{String(meta.verdict)}</span>
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
