import { IOIData, LOIData } from '@/lib/types/deal-templates';

export function generateIOI(data: IOIData): string {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
INDICATION OF INTEREST

Date: ${today}

To: [Seller Name / Broker]
From: ${data.buyerName}
Re: Potential Acquisition of ${data.companyName}

Dear [Seller/Broker],

Thank you for the opportunity to review the Confidential Information Memorandum for ${data.companyName}, a ${data.industry} business located in ${data.location}.

After preliminary review, I am pleased to submit this non-binding Indication of Interest to acquire the Company.

1. PURCHASE PRICE
   I propose a purchase price in the range of $${data.purchasePriceRange.min.toLocaleString()} to $${data.purchasePriceRange.max.toLocaleString()}, subject to due diligence and final negotiations.

2. TRANSACTION STRUCTURE
   ${data.structureType === 'asset' ? 
     'Asset purchase, acquiring substantially all operating assets and assuming certain agreed-upon liabilities.' :
     data.structureType === 'stock' ?
     'Stock purchase, acquiring 100% of the outstanding equity interests.' :
     'Structure to be determined based on tax and legal considerations.'}

3. FINANCING
   ${data.financingType === 'sba_7a' ?
     'SBA 7(a) loan for up to 90% of purchase price, with 10% equity injection by buyer.' :
     data.financingType === 'conventional' ?
     'Conventional bank financing or private capital.' :
     data.financingType === 'seller_financing' ?
     'Combination of buyer equity and seller financing.' :
     'To be determined based on deal structure and seller preferences.'}

4. DUE DILIGENCE
   I request a ${data.dueDiligencePeriod}-day due diligence period to review:
${data.keyConditions.map(c => `   - ${c}`).join('\n')}

5. TIMELINE
   Target closing date: ${data.targetCloseDate}

${data.exclusivityRequested ? `
6. EXCLUSIVITY
   I respectfully request ${data.exclusivityPeriod || 30} days of exclusivity to complete due diligence and negotiate a Letter of Intent.
` : ''}

This Indication of Interest is non-binding and subject to satisfactory completion of due diligence, negotiation of definitive agreements, and internal approvals.

I am excited about the opportunity to continue discussions. Please feel free to contact me at ${data.buyerEmail} or ${data.buyerPhone}.

Sincerely,

${data.buyerName}
${data.buyerEntity}
  `.trim();
}

export function generateLOI(data: LOIData): string {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const cashAtClose = data.purchasePrice - (data.sellerNoteAmount || 0) - (data.earnoutAmount || 0);
  
  return `
LETTER OF INTENT

Date: ${today}

To: [Seller Name]
From: ${data.buyerName}
Re: Proposed Acquisition of ${data.companyName}

Dear [Seller],

This Letter of Intent ("LOI") outlines the principal terms under which ${data.buyerEntity} ("Buyer") proposes to acquire ${data.companyName} ("Company") from [Seller] ("Seller").

1. PURCHASE PRICE
   $${data.purchasePrice.toLocaleString()}, subject to the working capital adjustment described below.

2. TRANSACTION STRUCTURE
   ${data.structureType === 'asset' ? 
     'Asset purchase. Buyer will acquire substantially all operating assets and assume certain agreed-upon liabilities.' :
     'Stock purchase. Buyer will acquire 100% of the outstanding equity interests.'}

3. PURCHASE PRICE ALLOCATION
   - Cash at Close: $${cashAtClose.toLocaleString()}
${data.sellerNoteAmount ? `   - Seller Note: $${data.sellerNoteAmount.toLocaleString()}${data.sellerNoteTerms ? ` (${data.sellerNoteTerms})` : ''}` : ''}
${data.earnoutAmount ? `   - Earnout: Up to $${data.earnoutAmount.toLocaleString()}${data.earnoutTriggers ? ` (${data.earnoutTriggers})` : ''}` : ''}

4. WORKING CAPITAL ADJUSTMENT
   ${data.workingCapitalMechanism}

5. DUE DILIGENCE
   ${data.dueDiligencePeriod}-day due diligence period commencing upon execution of this LOI. 
   
   Buyer will review:
${data.keyConditions.map(c => `   - ${c}`).join('\n')}

6. REPRESENTATIONS AND WARRANTIES
   Standard representations and warranties for a transaction of this type, including but not limited to:
${data.repAndWarrantyExpectations.map(r => `   - ${r}`).join('\n')}

7. NON-COMPETE / NON-SOLICIT
   Seller agrees to a ${data.nonCompetePeriod}-year non-compete within ${data.nonCompeteRadius} miles of the Company's location and a non-solicitation of employees and customers.

8. TRANSITION
   Seller will provide ${data.transitionPeriod} months of transitional assistance post-closing.

${data.employeeRetention.length > 0 ? `
9. EMPLOYEE RETENTION
   Buyer intends to retain the following key employees:
${data.employeeRetention.map(e => `   - ${e}`).join('\n')}
` : ''}

10. CONDITIONS TO CLOSING
${data.contingencies.map((c, i) => `    ${String.fromCharCode(97 + i)}) ${c}`).join('\n')}

11. TIMELINE
    Target Closing: ${data.targetCloseDate}

12. EXCLUSIVITY
    During the ${data.dueDiligencePeriod}-day due diligence period, Seller agrees not to solicit or entertain offers from other potential buyers.

13. CONFIDENTIALITY
    Both parties agree to keep the terms of this LOI and all related discussions confidential.

14. NON-BINDING NATURE
    Except for Sections 12 (Exclusivity), 13 (Confidentiality), and 15 (Expenses), this LOI is non-binding. Binding obligations will be set forth in the definitive Purchase Agreement.

15. EXPENSES
    Each party will bear its own expenses.

If these terms are acceptable, please sign below and return a copy to me.

Sincerely,

${data.buyerName}
${data.buyerEntity}
${data.buyerEmail}
${data.buyerPhone}


ACKNOWLEDGED AND AGREED:

Seller: ___________________________    Date: _______________

  `.trim();
}
