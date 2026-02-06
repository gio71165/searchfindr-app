'use client';

import { type MutableRefObject } from 'react';
import { PassDealModal } from '@/components/modals/PassDealModal';
import { ProceedDealModal } from '@/components/modals/ProceedDealModal';
import { ParkDealModal } from '@/components/modals/ParkDealModal';
import type { Deal } from '@/lib/types/deal';

export function DealVerdictModals({
  deal,
  dealId,
  brokerName,
  sessionStartedAtRef,
  showPassModal,
  setShowPassModal,
  showProceedModal,
  setShowProceedModal,
  showParkModal,
  setShowParkModal,
  onPassSuccess,
  onProceedSuccess,
  onParkSuccess,
}: {
  deal: Deal;
  dealId: string;
  brokerName: string | null;
  sessionStartedAtRef: MutableRefObject<number>;
  showPassModal: boolean;
  setShowPassModal: (v: boolean) => void;
  showProceedModal: boolean;
  setShowProceedModal: (v: boolean) => void;
  showParkModal: boolean;
  setShowParkModal: (v: boolean) => void;
  onPassSuccess: () => void;
  onProceedSuccess: () => void;
  onParkSuccess: () => void;
}) {
  const sessionDurationSeconds = Math.round(
    (Date.now() - sessionStartedAtRef.current) / 1000
  );
  const companyName = deal.company_name || 'this deal';

  return (
    <>
      {showPassModal && (
        <PassDealModal
          dealId={dealId}
          companyName={companyName}
          workspaceId={deal.workspace_id}
          deal={deal}
          sessionDurationSeconds={sessionDurationSeconds}
          onClose={() => setShowPassModal(false)}
          onSuccess={onPassSuccess}
        />
      )}
      {showProceedModal && (
        <ProceedDealModal
          dealId={dealId}
          companyName={companyName}
          workspaceId={deal.workspace_id}
          sessionDurationSeconds={sessionDurationSeconds}
          brokerName={brokerName}
          onClose={() => setShowProceedModal(false)}
          onSuccess={onProceedSuccess}
        />
      )}
      {showParkModal && (
        <ParkDealModal
          dealId={dealId}
          companyName={companyName}
          workspaceId={deal.workspace_id}
          sessionDurationSeconds={sessionDurationSeconds}
          brokerName={brokerName}
          onClose={() => setShowParkModal(false)}
          onSuccess={onParkSuccess}
        />
      )}
    </>
  );
}
