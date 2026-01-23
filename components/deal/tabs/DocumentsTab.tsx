'use client';

import { DealDocuments } from '@/components/deal/DealDocuments';
import type { Deal } from '@/lib/types/deal';

interface DocumentsTabProps {
  deal: Deal;
  dealId: string;
}

export function DocumentsTab({ deal, dealId }: DocumentsTabProps) {
  return (
    <div className="space-y-6">
      {/* Documents Management */}
      <DealDocuments dealId={dealId} />
    </div>
  );
}
