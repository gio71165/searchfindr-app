import type { ConfidenceLevel, AIConfidence } from './types';
import type { ConfidenceJson } from '@/lib/types/deal';

/**
 * Maps old confidence formats (low/medium/high, numeric scores) to tier-based A/B/C
 */
function mapToTier(input: unknown): ConfidenceLevel {
  if (!input) return 'C';
  
  const s = String(input).trim().toUpperCase();
  
  // Direct A/B/C match
  if (s === 'A' || s === 'TIER A') return 'A';
  if (s === 'B' || s === 'TIER B') return 'B';
  if (s === 'C' || s === 'TIER C') return 'C';
  
  // Map old low/medium/high to A/B/C
  const lower = s.toLowerCase();
  if (lower === 'high' || lower.includes('high')) return 'A';
  if (lower === 'medium' || lower.includes('medium')) return 'B';
  if (lower === 'low' || lower.includes('low')) return 'C';
  
  // Map numeric scores (0-100) to tiers
  const num = Number(input);
  if (!isNaN(num) && isFinite(num)) {
    if (num >= 70) return 'A';
    if (num >= 40) return 'B';
    return 'C';
  }
  
  // Default to C (lowest confidence)
  return 'C';
}

export function normalizeConfidence(
  ai: AIConfidence
): { icon: '⚠️' | '◑' | '●'; label: string; reason: string; analyzed: boolean; level?: ConfidenceLevel } | null {
  if (!ai) return null;

  // Map old level format to tier
  const tier = mapToTier(ai.level);
  
  const iconFromLevel: Record<ConfidenceLevel, '⚠️' | '◑' | '●'> = {
    A: '●',
    B: '◑',
    C: '⚠️',
  };

  const icon = (ai.icon && ['⚠️', '◑', '●'].includes(ai.icon) ? ai.icon : null) || iconFromLevel[tier] || '◑';
  const labelCore = tier === 'A' ? 'A' : tier === 'B' ? 'B' : 'C';

  const reason =
    (ai.summary && String(ai.summary).trim()) ||
    (ai.signals && ai.signals.length > 0
      ? ai.signals
          .slice(0, 2)
          .map((s) => `${s.label}: ${s.value}`)
          .join(' • ')
      : '') ||
    'Data confidence set by latest analysis run.';

  return { icon, label: `Data confidence: ${labelCore}`, reason, analyzed: true, level: tier };
}

export function normalizeFinancialsConfidence(raw: unknown): { icon: '⚠️' | '◑' | '●'; label: string; reason: string; level?: ConfidenceLevel } | null {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return null;
  
  const tier = mapToTier(raw);
  const icon: '⚠️' | '◑' | '●' = tier === 'A' ? '●' : tier === 'B' ? '◑' : '⚠️';
  const label = `Data confidence: ${tier}`;
  return { icon, label, reason: 'Derived from latest Financial Analysis output.', level: tier };
}

import type { Deal, FinancialAnalysis } from '@/lib/types/deal';

export function getDealConfidence(
  deal: Deal,
  opts?: { financialAnalysis?: FinancialAnalysis | null }
): { icon: '⚠️' | '◑' | '●'; label: string; reason: string; analyzed: boolean; level?: ConfidenceLevel } {
  // 1) Prefer companies.ai_confidence_json if present (single source of truth)
  const fromDeal = normalizeConfidence((deal?.ai_confidence_json ?? null) as AIConfidence);
  if (fromDeal) return fromDeal;

  // 2) Financials: allow fallback to analysis.overall_confidence (DO NOT write this back to companies)
  if (deal?.source_type === 'financials' && opts?.financialAnalysis) {
    const fallback = normalizeFinancialsConfidence(opts.financialAnalysis?.overall_confidence ?? null);
    if (fallback) {
      return { ...fallback, analyzed: true };
    }
  }

  // Not analyzed (neutral)
  return {
    icon: '◑',
    label: 'Data confidence: Not analyzed',
    reason: 'No analysis run yet. Run AI to generate signals and confidence.',
    analyzed: false,
  };
}
