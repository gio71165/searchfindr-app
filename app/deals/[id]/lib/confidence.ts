import type { ConfidenceLevel, AIConfidence } from './types';
import type { ConfidenceJson } from '@/lib/types/deal';

export function normalizeConfidence(
  ai: AIConfidence
): { icon: '⚠️' | '◑' | '●'; label: string; reason: string; analyzed: boolean; level?: ConfidenceLevel } | null {
  if (!ai) return null;

  const lvl = (ai.level || '').toLowerCase() as ConfidenceLevel;
  const iconFromLevel: Record<ConfidenceLevel, '⚠️' | '◑' | '●'> = {
    low: '⚠️',
    medium: '◑',
    high: '●',
  };

  const icon = (ai.icon && ['⚠️', '◑', '●'].includes(ai.icon) ? ai.icon : null) || iconFromLevel[lvl] || '◑';
  const labelCore = lvl === 'high' ? 'High' : lvl === 'medium' ? 'Medium' : lvl === 'low' ? 'Low' : 'Medium';

  const reason =
    (ai.summary && String(ai.summary).trim()) ||
    (ai.signals && ai.signals.length > 0
      ? ai.signals
          .slice(0, 2)
          .map((s) => `${s.label}: ${s.value}`)
          .join(' • ')
      : '') ||
    'Data confidence set by latest analysis run.';

  return { icon, label: `Data confidence: ${labelCore}`, reason, analyzed: true, level: lvl };
}

export function normalizeFinancialsConfidence(raw: unknown): { icon: '⚠️' | '◑' | '●'; label: string; reason: string } | null {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return null;
  const lower = s.toLowerCase();

  let level: ConfidenceLevel = 'medium';
  if (lower.includes('weak') || lower.includes('low') || lower.includes('poor')) level = 'low';
  if (lower.includes('strong') || lower.includes('high') || lower.includes('good')) level = 'high';
  if (lower.includes('mixed') || lower.includes('medium') || lower.includes('moderate')) level = 'medium';

  const icon: '⚠️' | '◑' | '●' = level === 'low' ? '⚠️' : level === 'high' ? '●' : '◑';
  const label = `Data confidence: ${level === 'high' ? 'High' : level === 'low' ? 'Low' : 'Medium'}`;
  return { icon, label, reason: 'Derived from latest Financial Analysis output.' };
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
      return { ...fallback, analyzed: true, level: undefined };
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
