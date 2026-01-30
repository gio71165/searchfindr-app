import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { Deal, FinancialAnalysis, FinancialMetrics, QoeRedFlag } from '@/lib/types/deal';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2px solid #2563eb', // Blue-600
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0b1220', // Dark foreground
    marginBottom: 8,
  },
  companyMeta: {
    fontSize: 12,
    color: '#64748b', // Slate-500
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb', // Blue-600
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: '1px solid #e2e8f0', // Slate-200
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b', // Slate-800
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 11,
    color: '#334155', // Slate-700
    lineHeight: 1.6,
    marginBottom: 8,
  },
  bulletList: {
    marginLeft: 16,
    marginBottom: 8,
  },
  bulletItem: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 1.6,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#f8fafc', // Slate-50
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
    border: '1px solid #e2e8f0',
  },
  grid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f8fafc',
    marginRight: 8,
    borderRadius: 4,
    border: '1px solid #e2e8f0',
  },
  gridItemLast: {
    marginRight: 0,
  },
  label: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0b1220',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 6,
    marginBottom: 4,
  },
  badgeGreen: {
    backgroundColor: '#dcfce7', // Green-100
    color: '#166534', // Green-800
  },
  badgeYellow: {
    backgroundColor: '#fef3c7', // Yellow-100
    color: '#92400e', // Yellow-800
  },
  badgeRed: {
    backgroundColor: '#fee2e2', // Red-100
    color: '#991b1b', // Red-800
  },
  badgeBlue: {
    backgroundColor: '#dbeafe', // Blue-100
    color: '#1e40af', // Blue-800
  },
  redFlagItem: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#fef2f2', // Red-50
    borderRadius: 4,
    borderLeft: '3px solid #ef4444', // Red-500
  },
  strengthItem: {
    marginBottom: 8,
    paddingLeft: 16,
    fontSize: 11,
    color: '#334155',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#94a3b8', // Slate-400
    paddingTop: 20,
    borderTop: '1px solid #e2e8f0',
  },
  pageBreak: {
    marginBottom: 20,
  },
});

interface DealExportPDFProps {
  deal: Deal;
  financialAnalysis?: FinancialAnalysis | null;
}

export function DealExportPDF({ deal, financialAnalysis }: DealExportPDFProps) {
  // Extract deal data
  const companyName = deal.company_name || 'Untitled Company';
  const location = [
    deal.location_city,
    deal.location_state,
  ]
    .filter(Boolean)
    .join(', ') || 'Location not specified';
  const industry = deal.industry || 'Industry not specified';
  
  // Extract verdict and economics
  const verdict = (deal as any).verdict || deal.criteria_match_json?.verdict || null;
  const verdictConfidence = (deal as any).verdict_confidence || null;
  const verdictReason = (deal as any).verdict_reason || null;
  const nextAction = (deal as any).next_action || deal.criteria_match_json?.recommended_next_action || null;
  const askingPrice = (deal as any).asking_price_extracted || deal.criteria_match_json?.asking_price || null;
  const ebitda = (deal as any).ebitda_ttm_extracted || deal.criteria_match_json?.ebitda_ttm || null;
  const sbaEligible = (deal as any).sba_eligible !== undefined 
    ? (deal as any).sba_eligible 
    : deal.criteria_match_json?.sba_eligible ?? null;
  
  // Extract tier
  const tier = deal.final_tier || null;
  
  // Extract financial data
  const fin = deal.ai_financials_json || financialAnalysis?.extracted_metrics || {};
  const revenue = Array.isArray(fin.revenue) && fin.revenue.length > 0
    ? fin.revenue[0]?.value || 'Not stated'
    : typeof fin.revenue === 'string' 
      ? fin.revenue 
      : 'Not stated';
  const ebitdaValue = Array.isArray(fin.ebitda) && fin.ebitda.length > 0
    ? fin.ebitda[0]?.value || 'Not stated'
    : typeof fin.ebitda === 'string'
      ? fin.ebitda
      : 'Not stated';
  const margin = typeof fin.margin === 'string' ? fin.margin : 'Not stated';
  
  // Extract red flags
  const redFlags = deal.ai_red_flags 
    ? (typeof deal.ai_red_flags === 'string' 
        ? deal.ai_red_flags.split('\n').filter(Boolean)
        : Array.isArray(deal.ai_red_flags) 
          ? deal.ai_red_flags 
          : [])
    : financialAnalysis?.red_flags || [];
  
  // Extract QoE red flags
  const qoeRedFlags: QoeRedFlag[] = fin.qoe_red_flags || financialAnalysis?.qoe_red_flags || [];
  
  // Extract strengths (green flags)
  const strengths = financialAnalysis?.green_flags || [];
  
  // Extract risk signals from scoring
  const scoring = deal.ai_scoring_json || {};
  const riskSignals: string[] = [];
  if (scoring.succession_risk && scoring.succession_risk !== 'Low') {
    riskSignals.push(`Succession Risk: ${scoring.succession_risk} - ${scoring.succession_risk_reason || 'No reason provided'}`);
  }
  if (scoring.industry_fit && scoring.industry_fit !== 'High') {
    riskSignals.push(`Industry Fit: ${scoring.industry_fit} - ${scoring.industry_fit_reason || 'No reason provided'}`);
  }
  if (scoring.geography_fit && scoring.geography_fit !== 'High') {
    riskSignals.push(`Geography Fit: ${scoring.geography_fit} - ${scoring.geography_fit_reason || 'No reason provided'}`);
  }
  if (scoring.operational_quality_signal && scoring.operational_quality_signal !== 'High') {
    riskSignals.push(`Operational Quality: ${scoring.operational_quality_signal}`);
  }
  
  // Extract executive summary
  const executiveSummary = deal.ai_summary || 'No executive summary available.';
  
  // Generate date
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.companyMeta}>{location}</Text>
          <Text style={styles.companyMeta}>{industry}</Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <Text style={styles.paragraph}>{executiveSummary}</Text>
        </View>

        {/* Financial Snapshot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Snapshot</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Revenue</Text>
              <Text style={styles.value}>{String(revenue)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>EBITDA</Text>
              <Text style={styles.value}>{String(ebitdaValue)}</Text>
            </View>
            <View style={[styles.gridItem, styles.gridItemLast]}>
              <Text style={styles.label}>Margin</Text>
              <Text style={styles.value}>{String(margin)}</Text>
            </View>
          </View>
          {(askingPrice || ebitda || sbaEligible !== null) && (
            <View style={styles.grid}>
              {askingPrice && (
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Asking Price</Text>
                  <Text style={styles.value}>{askingPrice}</Text>
                </View>
              )}
              {ebitda && (
                <View style={styles.gridItem}>
                  <Text style={styles.label}>EBITDA (TTM)</Text>
                  <Text style={styles.value}>{ebitda}</Text>
                </View>
              )}
              {sbaEligible !== null && (
                <View style={[styles.gridItem, styles.gridItemLast]}>
                  <Text style={styles.label}>SBA Eligible</Text>
                  <Text style={styles.value}>{sbaEligible ? 'Yes' : 'No'}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* QoE Red Flags */}
        {qoeRedFlags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quality of Earnings Red Flags</Text>
            {qoeRedFlags.map((flag, idx) => (
              <View key={idx} style={styles.redFlagItem}>
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={[
                    styles.badge,
                    flag.severity === 'high' ? styles.badgeRed :
                    flag.severity === 'medium' ? styles.badgeYellow :
                    styles.badgeBlue
                  ]}>
                    {flag.severity.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                    {flag.type.replace(/_/g, ' ')}
                  </Text>
                </View>
                <Text style={styles.paragraph}>{flag.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Strengths */}
        {strengths.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Strengths</Text>
            {strengths.map((strength, idx) => (
              <Text key={idx} style={styles.strengthItem}>
                • {strength}
              </Text>
            ))}
          </View>
        )}

        {/* Risk Signals */}
        {riskSignals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Risk Signals</Text>
            {riskSignals.map((signal, idx) => (
              <Text key={idx} style={styles.bulletItem}>
                • {signal}
              </Text>
            ))}
          </View>
        )}

        {/* General Red Flags */}
        {redFlags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Red Flags</Text>
            {redFlags.map((flag, idx) => (
              <Text key={idx} style={styles.bulletItem}>
                • {typeof flag === 'string' ? flag : JSON.stringify(flag)}
              </Text>
            ))}
          </View>
        )}

        {/* AI Verdict & Tier */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Verdict & Tier</Text>
          <View style={styles.card}>
            {verdict && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.label}>Verdict</Text>
                <Text style={[
                  styles.badge,
                  verdict.toLowerCase() === 'proceed' ? styles.badgeGreen :
                  verdict.toLowerCase() === 'park' ? styles.badgeBlue :
                  styles.badgeRed
                ]}>
                  {verdict}
                </Text>
              </View>
            )}
            {tier && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.label}>Tier</Text>
                <Text style={[styles.badge, styles.badgeBlue]}>
                  Tier {tier}
                </Text>
              </View>
            )}
            {verdictConfidence && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.label}>Confidence</Text>
                <Text style={styles.paragraph}>{verdictConfidence}</Text>
              </View>
            )}
            {verdictReason && (
              <View>
                <Text style={styles.label}>Reason</Text>
                <Text style={styles.paragraph}>{verdictReason}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Next Steps */}
        {nextAction && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Steps</Text>
            <Text style={styles.paragraph}>{nextAction}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by SearchFindr on {generatedDate}
        </Text>
      </Page>
    </Document>
  );
}
