'use client';

import { DDTracker } from '@/app/deals/[id]/components/DDTracker';
import { DiligenceChecklist } from '@/app/deals/[id]/components/DiligenceChecklist';
import type { Deal, FinancialAnalysis } from '@/lib/types/deal';

interface DiligenceTabProps {
  deal: Deal;
  dealId: string;
  sourceType: 'cim_pdf' | 'on_market' | 'off_market' | 'financials';
  financialAnalysis?: FinancialAnalysis | null;
}

export function DiligenceTab({ deal, dealId, sourceType, financialAnalysis }: DiligenceTabProps) {
  const criteria = deal.criteria_match_json || {};
  const criteriaAny = criteria as Record<string, unknown>;
  
  // For financials, use diligence_notes from financialAnalysis
  const ddChecklist: string[] = sourceType === 'financials' && financialAnalysis?.diligence_notes
    ? (Array.isArray(financialAnalysis.diligence_notes) 
        ? financialAnalysis.diligence_notes.map(String)
        : [String(financialAnalysis.diligence_notes)])
    : (Array.isArray(criteriaAny.dd_checklist) 
        ? criteriaAny.dd_checklist.map(String) 
        : []);

  return (
    <div className="space-y-6">
      {/* Due Diligence Checklist */}
      <DiligenceChecklist
        items={ddChecklist}
        dealId={dealId}
        emptyText={
          sourceType === 'cim_pdf'
            ? 'No checklist generated yet. Re-run CIM processing to populate this.'
            : sourceType === 'financials'
            ? 'No diligence checklist items returned. Run Financial Analysis to generate one.'
            : 'No checklist available yet.'
        }
      />

      {/* DD Tracker */}
      <DDTracker dealId={dealId} />
    </div>
  );
}
