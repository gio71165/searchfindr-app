'use client';

import { DealActivityTimeline } from '@/components/deal/DealActivityTimeline';

interface ActivityTabProps {
  dealId: string;
}

export function ActivityTab({ dealId }: ActivityTabProps) {
  return (
    <div className="space-y-6">
      {/* Activity Timeline */}
      <div className="border border-slate-700 rounded-lg p-4 sm:p-6 bg-slate-800">
        <DealActivityTimeline dealId={dealId} />
      </div>
    </div>
  );
}
