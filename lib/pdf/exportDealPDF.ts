import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { DealExportPDF } from './dealExportPDF';
import type { Deal, FinancialAnalysis } from '@/lib/types/deal';

/**
 * Generate and download a PDF for a deal analysis
 */
export async function exportDealToPDF(
  deal: Deal,
  financialAnalysis?: FinancialAnalysis | null
): Promise<void> {
  try {
    // Generate PDF blob
    const doc = React.createElement(DealExportPDF, { deal, financialAnalysis });
    // @ts-ignore - pdf() accepts React elements that render Document
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename: [Company_Name]_SearchFindr_Analysis.pdf
    const companyName = deal.company_name || 'Untitled_Company';
    const sanitizedName = companyName
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    link.download = `${sanitizedName}_SearchFindr_Analysis.pdf`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}
