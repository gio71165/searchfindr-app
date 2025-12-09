// app/deals/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../supabaseClient';

export default function DealDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string | undefined;

  const [deal, setDeal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Existing AI (Chrome extension) states
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false);

  // CIM AI states
  const [processingCim, setProcessingCim] = useState(false);
  const [cimError, setCimError] = useState<string | null>(null);
  const [cimSuccess, setCimSuccess] = useState(false);

  // ------------------------------------------------------------------------------------
  // Load deal from Supabase
  // ------------------------------------------------------------------------------------
  useEffect(() => {
    if (!id) return;

    const loadDeal = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading deal:', error);
      } else {
        setDeal(data);
      }
      setLoading(false);
    };

    loadDeal();
  }, [id]);

  // ------------------------------------------------------------------------------------
  // On-market AI analysis
  // ------------------------------------------------------------------------------------
  const runAnalysis = async () => {
    if (!id || !deal) return;

    if (!deal.raw_listing_text) {
      setAiError('This deal has no listing text stored yet.');
      return;
    }

    setAnalyzing(true);
    setAiError(null);

    try {
      const res = await fetch('/api/analyze-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingText: deal.raw_listing_text,
          companyName: deal.company_name,
          city: deal.location_city,
          state: deal.location_state,
          sourceType: deal.source_type,
          listingUrl: deal.listing_url,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to analyze deal.');
      }

      const {
        ai_summary,
        ai_red_flags,
        financials,
        scoring,
        criteria_match,
      } = json;

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          ai_summary,
          ai_red_flags,
          ai_financials_json: financials,
          ai_scoring_json: scoring,
          criteria_match_json: criteria_match,
        })
        .eq('id', id);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw new Error('Failed to save AI result: ' + updateError.message);
      }

      setDeal((prev: any) =>
        prev
          ? {
              ...prev,
              ai_summary,
              ai_red_flags,
              ai_financials_json: financials,
              ai_scoring_json: scoring,
              criteria_match_json: criteria_match,
            }
          : prev
      );
    } catch (err: any) {
      console.error('runAnalysis error', err);
      setAiError(err.message || 'Something went wrong running AI.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Auto-run AI for Chrome extension deals (NOT for CIM)
  useEffect(() => {
    if (
      deal &&
      deal.source_type !== 'cim_pdf' &&
      !deal.ai_summary &&
      !autoTriggeredRef.current
    ) {
      autoTriggeredRef.current = true;
      runAnalysis();
    }
  }, [deal]);

  // ------------------------------------------------------------------------------------
  // CIM: Run AI on PDF
  // ------------------------------------------------------------------------------------
  const runCimAnalysis = async () => {
    if (!deal?.cim_storage_path || deal.source_type !== 'cim_pdf') {
      setCimError('This is not a CIM deal or the file path is missing.');
      return;
    }

    setProcessingCim(true);
    setCimError(null);
    setCimSuccess(false);

    try {
      const res = await fetch('/api/process-cim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: deal.id,
          cimStoragePath: deal.cim_storage_path,
          companyName: deal.company_name,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        console.error('process-cim status:', res.status);
        console.error('process-cim json:', json);
        setCimError(json.error || 'Failed to process CIM.');
        setProcessingCim(false);
        return;
      }

      const {
        ai_summary,
        ai_red_flags,
        financials,
        scoring,
        criteria_match,
      } = json;

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          ai_summary,
          ai_red_flags,
          ai_financials_json: financials,
          ai_scoring_json: scoring,
          criteria_match_json: criteria_match,
        })
        .eq('id', deal.id);

      if (updateError) {
        console.error('Supabase update error (CIM):', updateError);
        setCimError('CIM processed, but failed to save AI result.');
        setProcessingCim(false);
        return;
      }

      setDeal((prev: any) =>
        prev
          ? {
              ...prev,
              ai_summary,
              ai_red_flags,
              ai_financials_json: financials,
              ai_scoring_json: scoring,
              criteria_match_json: criteria_match,
            }
          : prev
      );

      setCimSuccess(true);
    } catch (err) {
      console.error(err);
      setCimError('Unexpected error processing CIM.');
    }

    setProcessingCim(false);
  };

  // ------------------------------------------------------------------------------------
  // Page states
  // ------------------------------------------------------------------------------------
  if (!id) {
    return <main className="py-10 text-center">Loading deal…</main>;
  }

  if (loading) {
    return <main className="py-10 text-center">Loading deal details…</main>;
  }

  if (!deal) {
    return (
      <main className="py-10 text-center text-red-600">
        Deal not found.
      </main>
    );
  }

  // Branch: CIM vs On-market
  if (deal.source_type === 'cim_pdf') {
    return (
      <CimDealView
        deal={deal}
        onBack={() => router.push('/dashboard')}
        processingCim={processingCim}
        cimError={cimError}
        cimSuccess={cimSuccess}
        onRunCim={runCimAnalysis}
      />
    );
  }

  return (
    <OnMarketDealView
      deal={deal}
      onBack={() => router.push('/dashboard')}
      analyzing={analyzing}
      aiError={aiError}
      onRunAnalysis={runAnalysis}
    />
  );
}

// ====================================================================================
// Shared helper: normalize red flags from JSON/string/array → string[]
// ====================================================================================

const normalizeRedFlags = (raw: any): string[] => {
  if (!raw) return [];

  // Already an array
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }

  // JSON string or plain string
  if (typeof raw === 'string') {
    // Try to parse JSON array from string: '["flag1","flag2"]'
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      // Not valid JSON, fall through to treat it as plain text
    }

    // Single string case
    const trimmed = raw.trim();
    return trimmed ? [trimmed] : [];
  }

  // Anything else – coerce to string
  const asString = String(raw).trim();
  return asString ? [asString] : [];
};

// ====================================================================================
// ON-MARKET DEAL VIEW (Chrome extension)
// ====================================================================================

function OnMarketDealView({
  deal,
  onBack,
  analyzing,
  aiError,
  onRunAnalysis,
}: {
  deal: any;
  onBack: () => void;
  analyzing: boolean;
  aiError: string | null;
  onRunAnalysis: () => void;
}) {
  const scoring = deal.ai_scoring_json || {};
  const fin = deal.ai_financials_json || {};
  const criteria = deal.criteria_match_json || {};

  const redFlags = normalizeRedFlags(deal.ai_red_flags);

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
        <button onClick={onBack} className="text-xs underline">
          ← Back to dashboard
        </button>

        {/* Header */}
        <section>
          <h1 className="text-3xl font-semibold mb-1">
            {deal.company_name || 'Untitled Company'}
          </h1>
          <p className="text-sm">
            {deal.location_city && `${deal.location_city}, `}
            {deal.location_state} • Source: {deal.source_type}
            {deal.listing_url && (
              <>
                {' • '}
                <a
                  href={deal.listing_url}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  View listing
                </a>
              </>
            )}
          </p>
        </section>

        {/* AI Summary + Run AI */}
        <section className="card-section">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">AI Summary</h2>
            <button
              onClick={onRunAnalysis}
              disabled={analyzing}
              className="text-xs px-2 py-1 border rounded"
            >
              {analyzing
                ? 'Analyzing…'
                : deal.ai_summary
                ? 'Re-run AI'
                : 'Run AI'}
            </button>
          </div>

          {aiError && (
            <p className="text-xs text-red-500 mb-1">{aiError}</p>
          )}

          <p className="whitespace-pre-line text-sm">
            {deal.ai_summary ||
              'No AI summary available yet. Run AI to generate one.'}
          </p>
        </section>

        {/* Financials */}
        <section className="card-section">
          <h2 className="text-lg font-semibold mb-3">Financials</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs uppercase">Revenue</p>
              <p className="font-medium">
                {deal.revenue || fin.revenue || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase">EBITDA</p>
              <p className="font-medium">
                {deal.ebitda || fin.ebitda || '—'}
              </p>
            </div>

            {fin.margin && (
              <div>
                <p className="text-xs uppercase">Margin</p>
                <p className="font-medium">{fin.margin}</p>
              </div>
            )}

            {fin.customer_concentration && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase">Customer Concentration</p>
                <p className="font-medium">
                  {fin.customer_concentration}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Scoring */}
        <section className="card-section">
          <h2 className="text-lg font-semibold mb-3">Scoring Breakdown</h2>

          {Object.keys(scoring).length === 0 ? (
            <p className="text-sm">No scoring stored yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              {scoring.succession_risk && (
                <div>
                  <p className="font-semibold">Succession Risk</p>
                  <p>{scoring.succession_risk}</p>
                  <p className="text-xs">
                    {scoring.succession_risk_reason}
                  </p>
                </div>
              )}

              {scoring.industry_fit && (
                <div>
                  <p className="font-semibold">Industry Fit</p>
                  <p>{scoring.industry_fit}</p>
                  <p className="text-xs">
                    {scoring.industry_fit_reason}
                  </p>
                </div>
              )}

              {scoring.geography_fit && (
                <div>
                  <p className="font-semibold">Geography Fit</p>
                  <p>{scoring.geography_fit}</p>
                  <p className="text-xs">
                    {scoring.geography_fit_reason}
                  </p>
                </div>
              )}

              {scoring.final_tier && (
                <div className="md:col-span-2">
                  <p className="font-semibold">Final Tier</p>
                  <p>{scoring.final_tier}</p>
                  <p className="text-xs">
                    {scoring.final_tier_reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Red Flags */}
        <section className="card-red">
          <h2 className="text-lg font-semibold mb-2">Red Flags</h2>
          {redFlags.length === 0 ? (
            <p className="text-sm">No red flags detected.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-sm">
              {redFlags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          )}
        </section>

        {/* Criteria Match */}
        <section className="card-section">
          <h2 className="text-lg font-semibold mb-3">
            Fit with Search Criteria
          </h2>

          {!criteria || Object.keys(criteria).length === 0 ? (
            <p className="text-sm">No criteria analysis yet.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold">Deal Size Fit</p>
                <p>{criteria.deal_size || '—'}</p>
              </div>

              <div>
                <p className="font-semibold">Business Model</p>
                <p>{criteria.business_model || '—'}</p>
              </div>

              <div>
                <p className="font-semibold">Owner Profile</p>
                <p>{criteria.owner_profile || '—'}</p>
              </div>

              <div>
                <p className="font-semibold">Notes for Searcher</p>
                <p>{criteria.notes_for_searcher || '—'}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ====================================================================================
// CIM DEAL VIEW (PDF CIM) – richer layout
// ====================================================================================

function CimDealView({
  deal,
  onBack,
  processingCim,
  cimError,
  cimSuccess,
  onRunCim,
}: {
  deal: any;
  onBack: () => void;
  processingCim: boolean;
  cimError: string | null;
  cimSuccess: boolean;
  onRunCim: () => void;
}) {
  const scoring = deal.ai_scoring_json || {};
  const criteria = deal.criteria_match_json || {};
  const finRaw = deal.ai_financials_json || {};

  // Normalize financials for CIM shape
  const fin = {
    revenue:
      finRaw.revenue ??
      finRaw.revenue_ttm ??
      finRaw.revenue_1y_ago ??
      null,
    ebitda: finRaw.ebitda ?? finRaw.ebitda_ttm ?? null,
    margin: finRaw.margin ?? finRaw.ebitda_margin_ttm ?? null,
    customer_concentration: finRaw.customer_concentration ?? null,
    revenue_1y_ago: finRaw.revenue_1y_ago ?? null,
    revenue_2y_ago: finRaw.revenue_2y_ago ?? null,
    revenue_cagr_3y: finRaw.revenue_cagr_3y ?? null,
    capex_intensity: finRaw.capex_intensity ?? null,
    working_capital_needs: finRaw.working_capital_needs ?? null,
  };

  const redFlags = normalizeRedFlags(deal.ai_red_flags);
  const ddChecklist: string[] = Array.isArray(criteria.dd_checklist)
    ? criteria.dd_checklist.map(String)
    : [];

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
        <button onClick={onBack} className="text-xs underline">
          ← Back to dashboard
        </button>

        {/* HERO / HEADER */}
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold mb-1">
            {deal.company_name || 'CIM Deal'}
          </h1>
          <p className="text-sm">
            {deal.location_city && `${deal.location_city}, `}
            {deal.location_state || 'Location unknown'} • Source: CIM (PDF)
          </p>

          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span className="px-2 py-1 rounded-full border">
              Recurring revenue
            </span>
            {fin.customer_concentration && (
              <span className="px-2 py-1 rounded-full border">
                Low concentration
              </span>
            )}
            {fin.margin && (
              <span className="px-2 py-1 rounded-full border">
                EBITDA margin {fin.margin}
              </span>
            )}
            {scoring.final_tier && (
              <span className="px-2 py-1 rounded-full border">
                Tier {scoring.final_tier}
              </span>
            )}
          </div>

          {/* CIM Processing controls */}
          <div className="mt-4 card-section">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">CIM Processing</h2>
                <p className="text-xs text-muted-foreground">
                  Upload and re-run AI analysis on the original CIM PDF.
                </p>
              </div>
              <button
                onClick={onRunCim}
                disabled={processingCim}
                className="text-xs px-3 py-1 border rounded"
              >
                {processingCim ? 'Processing CIM…' : 'Run AI on CIM'}
              </button>
            </div>

            {cimError && (
              <p className="text-xs text-red-500 mt-1">{cimError}</p>
            )}

            {cimSuccess && (
              <p className="text-xs text-green-600 mt-1">
                CIM processed successfully. Analysis is up to date.
              </p>
            )}
          </div>
        </section>

        {/* MAIN GRID: Summary + Financial Snapshot */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Investment Memo */}
          <div className="lg:col-span-2 card-section">
            <h2 className="text-lg font-semibold mb-2">
              AI Investment Memo (CIM)
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {deal.ai_summary ||
                'No AI summary available yet. Run AI on CIM to generate an investment memo.'}
            </p>
          </div>

          {/* Financial Snapshot */}
          <div className="card-section space-y-3 text-sm">
            <h2 className="text-lg font-semibold mb-2">Financial Snapshot</h2>

            <div>
              <p className="text-xs uppercase">TTM Revenue</p>
              <p className="font-medium">
                {fin.revenue || 'Unknown'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase">TTM EBITDA</p>
              <p className="font-medium">
                {fin.ebitda || 'Unknown'}
              </p>
            </div>

            {fin.margin && (
              <div>
                <p className="text-xs uppercase">EBITDA Margin</p>
                <p className="font-medium">{fin.margin}</p>
              </div>
            )}

            {fin.revenue_1y_ago && (
              <div>
                <p className="text-xs uppercase">Revenue (1Y ago)</p>
                <p className="font-medium">
                  {fin.revenue_1y_ago}
                </p>
              </div>
            )}

            {fin.revenue_2y_ago && (
              <div>
                <p className="text-xs uppercase">Revenue (2Y ago)</p>
                <p className="font-medium">
                  {fin.revenue_2y_ago}
                </p>
              </div>
            )}

            {fin.revenue_cagr_3y && (
              <div>
                <p className="text-xs uppercase">3Y Revenue CAGR</p>
                <p className="font-medium">
                  {fin.revenue_cagr_3y}
                </p>
              </div>
            )}

            {fin.customer_concentration && (
              <div>
                <p className="text-xs uppercase">Customer Concentration</p>
                <p className="font-medium">
                  {fin.customer_concentration}
                </p>
              </div>
            )}

            {fin.capex_intensity && (
              <div>
                <p className="text-xs uppercase">Capex Intensity</p>
                <p className="font-medium">
                  {fin.capex_intensity}
                </p>
              </div>
            )}

            {fin.working_capital_needs && (
              <div>
                <p className="text-xs uppercase">Working Capital</p>
                <p className="font-medium">
                  {fin.working_capital_needs}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Scoring + Platform Fit */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-section text-sm space-y-4">
            <h2 className="text-lg font-semibold mb-1">Scoring Breakdown</h2>

            {scoring.succession_risk && (
              <div>
                <p className="font-semibold">Succession Risk</p>
                <p>{scoring.succession_risk}</p>
                <p className="text-xs">
                  {scoring.succession_risk_reason}
                </p>
              </div>
            )}

            {scoring.industry_fit && (
              <div>
                <p className="font-semibold">Industry Fit</p>
                <p>{scoring.industry_fit}</p>
                <p className="text-xs">
                  {scoring.industry_fit_reason}
                </p>
              </div>
            )}

            {scoring.geography_fit && (
              <div>
                <p className="font-semibold">Geography Fit</p>
                <p>{scoring.geography_fit}</p>
                <p className="text-xs">
                  {scoring.geography_fit_reason}
                </p>
              </div>
            )}

            {scoring.financial_quality && (
              <div>
                <p className="font-semibold">Financial Quality</p>
                <p>{scoring.financial_quality}</p>
                <p className="text-xs">
                  {scoring.financial_quality_reason}
                </p>
              </div>
            )}

            {scoring.final_tier && (
              <div>
                <p className="font-semibold">Final Tier</p>
                <p>{scoring.final_tier}</p>
                <p className="text-xs">
                  {scoring.final_tier_reason}
                </p>
              </div>
            )}
          </div>

          <div className="card-section text-sm space-y-3">
            <h2 className="text-lg font-semibold mb-1">
              Fit with Search Criteria
            </h2>

            <div>
              <p className="font-semibold">Deal Size Fit</p>
              <p>{criteria.deal_size || '—'}</p>
            </div>

            <div>
              <p className="font-semibold">Business Model</p>
              <p>{criteria.business_model || '—'}</p>
            </div>

            <div>
              <p className="font-semibold">Owner Profile</p>
              <p>{criteria.owner_profile || '—'}</p>
            </div>

            <div>
              <p className="font-semibold">Platform vs Add-on</p>
              <p>{criteria.platform_vs_addon || '—'}</p>
            </div>

            <div>
              <p className="font-semibold">Moat / Differentiation</p>
              <p>{criteria.moat_summary || '—'}</p>
            </div>

            <div>
              <p className="font-semibold">Integration Risks</p>
              <p>{criteria.integration_risks || '—'}</p>
            </div>

            <div>
              <p className="font-semibold">Notes for Searcher</p>
              <p>{criteria.notes_for_searcher || '—'}</p>
            </div>
          </div>
        </section>

        {/* Red Flags + DD Checklist */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-red">
            <h2 className="text-lg font-semibold mb-2">Red Flags</h2>
            {redFlags.length === 0 ? (
              <p className="text-sm">
                No explicit red flags list stored yet.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {redFlags.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="card-section">
            <h2 className="text-lg font-semibold mb-2">
              Due Diligence Checklist
            </h2>
            {ddChecklist.length === 0 ? (
              <p className="text-sm">
                No checklist generated yet. Re-run AI on CIM to populate this.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {ddChecklist.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
