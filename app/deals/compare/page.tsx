'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../supabaseClient';
import { normalizeStringArray, normalizeRedFlags } from '@/app/deals/[id]/lib/normalizers';
import { getDealConfidence } from '@/app/deals/[id]/lib/confidence';
import type { Deal, FinancialAnalysis, FinancialMetrics, DealScoring } from '@/lib/types/deal';
import { Download, X, ExternalLink, TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type ComparisonDeal = Deal & {
  financialAnalysis?: FinancialAnalysis | null;
};

interface ComparisonMetric {
  label: string;
  category: 'financial' | 'scoring' | 'risk' | 'fit' | 'other';
  getValue: (deal: ComparisonDeal) => string | number | null | undefined;
  formatValue?: (value: any) => string;
  betterWhen?: 'higher' | 'lower' | 'neutral';
  isNumeric?: boolean;
}

function ComparePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealIdsParam = searchParams.get('ids');

  const [deals, setDeals] = useState<ComparisonDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingCSV, setExportingCSV] = useState(false);

  useEffect(() => {
    if (!dealIdsParam) {
      setError('No deal IDs provided');
      setLoading(false);
      return;
    }

    const loadDeals = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/');
          return;
        }

        const ids = dealIdsParam.split(',').map(id => id.trim()).filter(Boolean);
        if (ids.length < 2) {
          setError('Must select at least 2 deals to compare');
          setLoading(false);
          return;
        }
        if (ids.length > 3) {
          setError('Maximum 3 deals can be compared at once. Please select fewer deals.');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/deals/compare?ids=${ids.join(',')}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load deals');
        }

        const data = await response.json();
        setDeals(data.deals || []);
      } catch (err) {
        console.error('Error loading deals:', err);
        setError(err instanceof Error ? err.message : 'Failed to load deals');
      } finally {
        setLoading(false);
      }
    };

    loadDeals();
  }, [dealIdsParam, router]);

  const handleRemoveDeal = (dealId: string) => {
    const remainingIds = deals.filter(d => d.id !== dealId).map(d => d.id);
    if (remainingIds.length < 2) {
      router.push('/dashboard');
    } else {
      router.push(`/deals/compare?ids=${remainingIds.join(',')}`);
    }
  };

  // Helper to extract numeric value from financial metric
  const extractNumericValue = (value: any): number | null => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and extract number
      const cleaned = value.replace(/[$,\s]/g, '').replace(/[Kk]/g, '000').replace(/[Mm]/g, '000000');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  // Helper to format money
  const formatMoney = (value: any): string => {
    if (value === null || value === undefined) return '—';
    const num = extractNumericValue(value);
    if (num === null) return String(value);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  // Helper to format percentage
  const formatPercent = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string' && value.includes('%')) return value;
    const num = extractNumericValue(value);
    if (num === null) return String(value);
    return `${num.toFixed(1)}%`;
  };

  // Helper to extract revenue TTM from multiple sources
  const getRevenueTTM = (deal: ComparisonDeal): string | number | null => {
    // Priority 1: Extracted field
    if ((deal as any).revenue_ttm_extracted) {
      return (deal as any).revenue_ttm_extracted;
    }
    // Priority 2: AI financials JSON
    const fin = deal.ai_financials_json || {};
    const finAny = fin as Record<string, unknown>;
    if (finAny.revenue_ttm) {
      return finAny.revenue_ttm as string | number;
    }
    // Priority 3: AI analysis financials
    const analysis = (deal as any).ai_analysis || {};
    if (analysis.financials?.revenue_ttm) {
      return analysis.financials.revenue_ttm;
    }
    // Priority 4: Legacy array format
    if (Array.isArray(fin.revenue) && fin.revenue.length > 0) {
      return fin.revenue[0]?.value || fin.revenue[0]?.note;
    }
    if (typeof fin.revenue === 'string') {
      return fin.revenue;
    }
    return null;
  };

  // Helper to extract EBITDA TTM from multiple sources
  const getEBITDATTM = (deal: ComparisonDeal): string | number | null => {
    // Priority 1: Extracted field
    if ((deal as any).ebitda_ttm_extracted) {
      return (deal as any).ebitda_ttm_extracted;
    }
    // Priority 2: AI financials JSON
    const fin = deal.ai_financials_json || {};
    const finAny = fin as Record<string, unknown>;
    if (finAny.ebitda_ttm) {
      return finAny.ebitda_ttm as string | number;
    }
    // Priority 3: AI analysis financials
    const analysis = (deal as any).ai_analysis || {};
    if (analysis.financials?.ebitda_ttm) {
      return analysis.financials.ebitda_ttm;
    }
    // Priority 4: Legacy array format
    if (Array.isArray(fin.ebitda) && fin.ebitda.length > 0) {
      return fin.ebitda[0]?.value || fin.ebitda[0]?.note;
    }
    if (typeof fin.ebitda === 'string') {
      return fin.ebitda;
    }
    return null;
  };

  // Helper to calculate EBITDA Margin
  const getEBITDAMargin = (deal: ComparisonDeal): string | null => {
    // Priority 1: Extracted margin
    if ((deal as any).ebitda_margin_ttm) {
      return (deal as any).ebitda_margin_ttm;
    }
    // Priority 2: Calculate from revenue and EBITDA
    const revenue = getRevenueTTM(deal);
    const ebitda = getEBITDATTM(deal);
    if (revenue && ebitda) {
      const revNum = extractNumericValue(revenue);
      const ebitdaNum = extractNumericValue(ebitda);
      if (revNum !== null && ebitdaNum !== null && revNum > 0) {
        return `${((ebitdaNum / revNum) * 100).toFixed(1)}%`;
      }
    }
    // Priority 3: From AI financials
    const fin = deal.ai_financials_json || {};
    if (typeof fin.margin === 'string') {
      return fin.margin;
    }
    return null;
  };

  // Helper to calculate Implied Multiple
  const getImpliedMultiple = (deal: ComparisonDeal): string | null => {
    // Priority 1: Extracted multiple
    if ((deal as any).implied_multiple) {
      return (deal as any).implied_multiple;
    }
    // Priority 2: Calculate from asking price and EBITDA
    const askingPrice = (deal as any).asking_price_extracted || 
                       deal.criteria_match_json?.asking_price ||
                       ((deal as any).ai_analysis?.deal_economics?.asking_price);
    const ebitda = getEBITDATTM(deal);
    if (askingPrice && ebitda) {
      const priceNum = extractNumericValue(askingPrice);
      const ebitdaNum = extractNumericValue(ebitda);
      if (priceNum !== null && ebitdaNum !== null && ebitdaNum > 0) {
        return `${(priceNum / ebitdaNum).toFixed(1)}x`;
      }
    }
    // Priority 3: From AI analysis
    const analysis = (deal as any).ai_analysis || {};
    if (analysis.deal_economics?.implied_multiple) {
      return analysis.deal_economics.implied_multiple;
    }
    // Priority 4: From AI financials
    const fin = deal.ai_financials_json || {};
    if ((fin as any).implied_multiple) {
      return (fin as any).implied_multiple;
    }
    return null;
  };

  // Helper to format asking price consistently
  const formatAskingPrice = (value: any): string => {
    if (!value) return '—';
    // If already formatted (e.g., "$2.85M"), return as-is
    if (typeof value === 'string' && (value.includes('M') || value.includes('K'))) {
      return value;
    }
    // Format number to millions/thousands
    return formatMoney(value);
  };

  // Define comparison metrics
  const comparisonMetrics: ComparisonMetric[] = useMemo(() => [
    // Financial Metrics
    {
      label: 'Revenue (TTM)',
      category: 'financial',
      getValue: getRevenueTTM,
      formatValue: formatMoney,
      betterWhen: 'higher',
      isNumeric: true,
    },
    {
      label: 'EBITDA (TTM)',
      category: 'financial',
      getValue: getEBITDATTM,
      formatValue: formatMoney,
      betterWhen: 'higher',
      isNumeric: true,
    },
    {
      label: 'EBITDA Margin %',
      category: 'financial',
      getValue: getEBITDAMargin,
      formatValue: (val) => val || '—',
      betterWhen: 'higher',
      isNumeric: true,
    },
    {
      label: 'Asking Price',
      category: 'financial',
      getValue: (deal) => {
        return (deal as any).asking_price_extracted || 
               deal.criteria_match_json?.asking_price || 
               ((deal as any).ai_analysis?.deal_economics?.asking_price) ||
               null;
      },
      formatValue: formatAskingPrice,
      betterWhen: 'lower',
      isNumeric: true,
    },
    {
      label: 'Implied Multiple',
      category: 'financial',
      getValue: getImpliedMultiple,
      formatValue: (val) => val || '—',
      betterWhen: 'lower',
      isNumeric: true,
    },
    // Scoring Metrics
    {
      label: 'Tier',
      category: 'scoring',
      getValue: (deal) => deal.final_tier,
      betterWhen: 'higher',
    },
    {
      label: 'Succession Risk',
      category: 'scoring',
      getValue: (deal) => {
        const scoring = deal.ai_scoring_json || {};
        return scoring.succession_risk || null;
      },
      betterWhen: 'lower',
    },
    {
      label: 'Industry Fit',
      category: 'fit',
      getValue: (deal) => {
        const scoring = deal.ai_scoring_json || {};
        return scoring.industry_fit || null;
      },
      betterWhen: 'higher',
    },
    {
      label: 'Geography Fit',
      category: 'fit',
      getValue: (deal) => {
        const scoring = deal.ai_scoring_json || {};
        return scoring.geography_fit || null;
      },
      betterWhen: 'higher',
    },
    {
      label: 'Data Confidence',
      category: 'scoring',
      getValue: (deal) => {
        const confidence = getDealConfidence(deal, { financialAnalysis: null });
        return confidence.level;
      },
      betterWhen: 'higher',
    },
    // Risk Metrics
    {
      label: 'Red Flag Count',
      category: 'risk',
      getValue: (deal) => {
        const flags = normalizeRedFlags(deal.ai_red_flags);
        return flags.length;
      },
      betterWhen: 'lower',
      isNumeric: true,
    },
    {
      label: 'QoE Red Flags',
      category: 'risk',
      getValue: (deal) => {
        // Priority 1: Extracted count
        if ((deal as any).qoe_red_flags_count !== undefined) {
          return (deal as any).qoe_red_flags_count;
        }
        // Priority 2: From AI analysis
        const analysis = (deal as any).ai_analysis || {};
        if (analysis.qoe?.addbacks && Array.isArray(analysis.qoe.addbacks)) {
          return analysis.qoe.addbacks.length;
        }
        // Priority 3: From AI financials
        const fin = deal.ai_financials_json || {};
        const qoeFlags = fin.qoe_red_flags || [];
        return qoeFlags.length;
      },
      betterWhen: 'lower',
      isNumeric: true,
    },
    // Other Metrics
    {
      label: 'SBA Eligible',
      category: 'other',
      getValue: (deal) => {
        // Priority 1: Direct field
        if ((deal as any).sba_eligible === true) return 'Yes';
        if ((deal as any).sba_eligible === false) return 'No';
        // Priority 2: From criteria match
        if (deal.criteria_match_json?.sba_eligible === true) return 'Yes';
        if (deal.criteria_match_json?.sba_eligible === false) return 'No';
        // Priority 3: From AI analysis
        const analysis = (deal as any).ai_analysis || {};
        const sbaAssessment = analysis.deal_economics?.sba_eligible?.assessment;
        if (sbaAssessment) {
          if (sbaAssessment === 'YES' || sbaAssessment === 'LIKELY') return 'Yes';
          if (sbaAssessment === 'NO') return 'No';
          return sbaAssessment; // Return "UNKNOWN" as-is
        }
        return null;
      },
      betterWhen: 'higher',
    },
    {
      label: 'Verdict',
      category: 'other',
      getValue: (deal) => {
        const verdict = (deal as any).verdict || deal.criteria_match_json?.verdict || null;
        return verdict ? verdict.charAt(0).toUpperCase() + verdict.slice(1) : null;
      },
      betterWhen: 'neutral',
    },
  ], []);

  // Determine winner for each metric
  const getWinner = (metric: ComparisonMetric): number | null => {
    if (metric.betterWhen === 'neutral') return null;
    
    const values = deals.map((deal, idx) => {
      const val = metric.getValue(deal);
      if (metric.isNumeric) {
        return { idx, value: extractNumericValue(val) };
      }
      // For non-numeric, convert to comparable values
      if (typeof val === 'string') {
        if (metric.betterWhen === 'higher') {
          // For tier/confidence: A > B > C
          if (val === 'A') return { idx, value: 3 };
          if (val === 'B') return { idx, value: 2 };
          if (val === 'C') return { idx, value: 1 };
          // For risk levels: Low > Medium > High
          if (val === 'Low') return { idx, value: 3 };
          if (val === 'Medium') return { idx, value: 2 };
          if (val === 'High') return { idx, value: 1 };
        } else if (metric.betterWhen === 'lower') {
          // Reverse for lower is better
          if (val === 'A') return { idx, value: 1 };
          if (val === 'B') return { idx, value: 2 };
          if (val === 'C') return { idx, value: 3 };
          if (val === 'Low') return { idx, value: 1 };
          if (val === 'Medium') return { idx, value: 2 };
          if (val === 'High') return { idx, value: 3 };
        }
      }
      return { idx, value: null };
    });

    const validValues = values.filter(v => v.value !== null);
    if (validValues.length === 0) return null;

    if (metric.betterWhen === 'higher') {
      const maxValue = Math.max(...validValues.map(v => v.value!));
      const winners = validValues.filter(v => v.value === maxValue);
      return winners.length === 1 ? winners[0].idx : null; // Only return winner if unique
    } else {
      const minValue = Math.min(...validValues.map(v => v.value!));
      const winners = validValues.filter(v => v.value === minValue);
      return winners.length === 1 ? winners[0].idx : null;
    }
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      const rows: string[][] = [];
      
      // Header row
      const headers = [
        'Metric',
        ...deals.map(d => d.company_name || 'Untitled')
      ];
      rows.push(headers);

      // Add all comparison metrics
      comparisonMetrics.forEach(metric => {
        const values = deals.map(deal => {
          const val = metric.getValue(deal);
          return metric.formatValue ? metric.formatValue(val) : (val || '—');
        });
        rows.push([metric.label, ...values.map(String)]);
      });

      // Convert to CSV
      const csvContent = rows.map(row => 
        row.map(cell => {
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ).join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deal_comparison_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('CSV exported successfully', 'success', 2000);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      showToast('Failed to export CSV', 'error');
    } finally {
      setExportingCSV(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-8 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-sm text-slate-400">Loading comparison...</p>
        </div>
      </div>
    );
  }

  if (error || deals.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 p-8 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error || 'No deals found'}</p>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Deal Comparison</h1>
          <p className="text-sm text-slate-400">Compare {deals.length} deals side-by-side</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={exportingCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-300 bg-blue-500/20 border border-blue-500/40 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exportingCSV ? 'Exporting...' : 'Export CSV'}
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-semibold text-slate-200 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Deal Headers */}
      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: `200px repeat(${deals.length}, 1fr)` }}>
        <div></div>
        {deals.map((deal, idx) => (
          <div key={deal.id} className="bg-slate-800 border border-slate-600 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-50 truncate mb-1">
                  {deal.company_name || 'Untitled Company'}
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  {deal.location_city && deal.location_state 
                    ? `${deal.location_city}, ${deal.location_state}`
                    : deal.location_city || deal.location_state || '—'}
                </p>
                {deal.industry && (
                  <p className="text-xs text-slate-500 mt-1">{deal.industry}</p>
                )}
              </div>
              <button
                onClick={() => handleRemoveDeal(deal.id)}
                className="ml-2 p-1 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                title="Remove from comparison"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Link
              href={`/deals/${deal.id}`}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View Details
            </Link>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="bg-slate-800 border border-slate-600 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50 border-b border-slate-600">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 sticky left-0 bg-slate-700/50 z-10 min-w-[200px]">
                  Metric
                </th>
                {deals.map((deal, idx) => (
                  <th key={deal.id} className="px-4 py-3 text-center text-sm font-semibold text-slate-300 min-w-[200px]">
                    Deal {idx + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {comparisonMetrics.map((metric, metricIdx) => {
                const winnerIdx = getWinner(metric);
                const values = deals.map((deal, idx) => {
                  const val = metric.getValue(deal);
                  return {
                    idx,
                    raw: val,
                    formatted: metric.formatValue ? metric.formatValue(val) : (val || '—'),
                  };
                });

                return (
                  <tr key={metricIdx} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-sm font-medium text-slate-200 sticky left-0 bg-slate-800 z-10">
                      {metric.label}
                    </td>
                    {values.map(({ idx, formatted, raw }) => {
                      const isWinner = winnerIdx === idx && winnerIdx !== null;
                      const isLoser = winnerIdx !== null && winnerIdx !== idx && raw !== null && raw !== undefined;
                      
                      return (
                        <td
                          key={idx}
                          className={`px-4 py-3 text-center text-sm ${
                            isWinner
                              ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                              : isLoser
                              ? 'bg-red-500/20 text-red-300'
                              : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {isWinner && <Award className="h-4 w-4 text-emerald-400" />}
                            {isLoser && <TrendingDown className="h-4 w-4 text-red-400" />}
                            {!isWinner && !isLoser && raw !== null && raw !== undefined && winnerIdx === null && (
                              <Minus className="h-4 w-4 text-slate-500" />
                            )}
                            <span>{formatted}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Section */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Strengths Comparison */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-50 mb-3">Key Strengths</h3>
          <div className="space-y-3">
            {deals.map((deal, idx) => {
              const strengths: string[] = [];
              const greenFlags = normalizeStringArray((deal as any).financialAnalysis?.green_flags);
              strengths.push(...greenFlags.slice(0, 3));
              if (strengths.length === 0) {
                const scoring = deal.ai_scoring_json || {};
                if (scoring.industry_fit === 'High') strengths.push('Strong industry fit');
                if (scoring.geography_fit === 'High') strengths.push('Strong geographic fit');
                if (scoring.succession_risk === 'Low') strengths.push('Low succession risk');
              }
              
              return (
                <div key={deal.id}>
                  <div className="text-xs font-semibold text-slate-400 mb-1">
                    Deal {idx + 1}: {deal.company_name || 'Untitled'}
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {strengths.slice(0, 3).map((s, sIdx) => (
                      <li key={sIdx} className="flex items-start gap-1">
                        <span className="text-emerald-400">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                    {strengths.length === 0 && <li className="text-slate-500">—</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risks Comparison */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-50 mb-3">Key Risks</h3>
          <div className="space-y-3">
            {deals.map((deal, idx) => {
              const risks: string[] = [];
              const scoring = deal.ai_scoring_json || {};
              if (scoring.succession_risk && scoring.succession_risk !== 'Low') {
                risks.push(`Succession Risk: ${scoring.succession_risk}`);
              }
              if (scoring.industry_fit && scoring.industry_fit !== 'High') {
                risks.push(`Industry Fit: ${scoring.industry_fit}`);
              }
              if (scoring.geography_fit && scoring.geography_fit !== 'High') {
                risks.push(`Geography Fit: ${scoring.geography_fit}`);
              }
              const redFlags = normalizeRedFlags(deal.ai_red_flags);
              risks.push(...redFlags.slice(0, 3 - risks.length));

              return (
                <div key={deal.id}>
                  <div className="text-xs font-semibold text-slate-400 mb-1">
                    Deal {idx + 1}: {deal.company_name || 'Untitled'}
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {risks.slice(0, 3).map((r, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-1">
                        <span className="text-red-400">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                    {risks.length === 0 && <li className="text-slate-500">—</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 p-8 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-sm text-slate-400">Loading comparison...</p>
        </div>
      </div>
    }>
      <ComparePageContent />
    </Suspense>
  );
}
