'use client';

import { DealStructureCalculator } from '@/app/deals/[id]/components/DealStructureCalculator';
import { WorkingCapitalAnalysis } from '@/app/deals/[id]/components/WorkingCapitalAnalysis';
import { ScenarioComparison } from '@/app/deals/[id]/components/ScenarioComparison';
import { GuidedModelingWizard } from '@/app/deals/[id]/components/GuidedModelingWizard';
import type { Deal } from '@/lib/types/deal';

interface ModelingTabProps {
  deal: Deal;
  sourceType: 'cim_pdf' | 'on_market' | 'off_market' | 'financials';
}

export function ModelingTab({ deal, sourceType }: ModelingTabProps) {
  return (
    <div className="space-y-6">
      {/* Guided financial modeling wizard */}
      <GuidedModelingWizard deal={deal} />

      {/* Deal Structure Calculator - Only for on-market deals */}
      {sourceType === 'on_market' && (
        <DealStructureCalculator deal={deal} />
      )}

      {/* Working Capital Analysis */}
      <WorkingCapitalAnalysis deal={deal} />

      {/* Scenario Analysis */}
      <ScenarioComparison deal={deal} />
    </div>
  );
}
