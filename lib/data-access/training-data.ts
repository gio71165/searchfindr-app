import { stripPiiFromJson } from '@/lib/utils/pii-strip';

/** Build extracted metrics snapshot from deal for ML (no PII/storage paths). */
export function buildExtractedMetrics(deal: Record<string, unknown>): Record<string, unknown> {
  const raw = {
    company_name: deal.company_name ?? null,
    industry: deal.industry ?? null,
    source_type: deal.source_type ?? null,
    location_state: deal.location_state ?? null,
    final_tier: deal.final_tier ?? null,
    score: deal.score ?? null,
    gut_check_score: deal.gut_check_score ?? null,
    asking_price_extracted: deal.asking_price_extracted ?? null,
    ebitda_ttm_extracted: deal.ebitda_ttm_extracted ?? null,
    revenue_ttm_extracted: deal.revenue_ttm_extracted ?? null,
    sba_eligible: deal.sba_eligible ?? null,
    deal_size_band: deal.deal_size_band ?? null,
    ai_summary: deal.ai_summary ?? null,
    ai_red_flags: deal.ai_red_flags ?? null,
    ai_financials_json: deal.ai_financials_json ?? null,
    ai_scoring_json: deal.ai_scoring_json ?? null,
    criteria_match_json: deal.criteria_match_json ?? null,
    ai_confidence_json: deal.ai_confidence_json ?? null,
  };
  return stripPiiFromJson(raw) as Record<string, unknown>;
}

/** Build financial_delta: marketed_ebitda vs adjusted_ebitda from deal. */
export function buildFinancialDelta(deal: Record<string, unknown>): Record<string, unknown> {
  const marketed = deal.ebitda_ttm_extracted ?? (deal as any).criteria_match_json?.ebitda_ttm ?? null;
  const criteria = (deal.criteria_match_json as Record<string, unknown> | null) ?? {};
  const fin = (deal.ai_financials_json as Record<string, unknown> | null) ?? {};
  const adjusted =
    (criteria as any).adjusted_ebitda ??
    (fin as any).ebitda_ttm ??
    (fin as any).adjusted_ebitda ??
    null;
  return { marketed_ebitda: marketed, adjusted_ebitda: adjusted };
}
