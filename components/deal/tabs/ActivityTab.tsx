'use client';

import { DealActivityTimeline } from '@/components/deal/DealActivityTimeline';

interface ActivityTabProps {
  dealId: string;
}

export function ActivityTab({ dealId }: ActivityTabProps) {
  return (
    <div className="space-y-6">
      {/* Activity Timeline */}
      <div className="border rounded-lg p-4 sm:p-6 bg-white">
        <DealActivityTimeline dealId={dealId} />
      </div>
    </div>
  );
}
