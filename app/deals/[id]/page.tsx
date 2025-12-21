// app/deals/[id]/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '../../supabaseClient';

// ====================================================================================
// Shared helpers
// ====================================================================================

// normalize JSON/string/array -> string[]
const normalizeStringArray = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    } catch {
      // ignore
    }
    return [trimmed];
  }

  const asString = String(raw).trim();
  return asString ? [asString] : [];
};

// Backwards compatibility: keep name used in other views
const normalizeRedFlags = (raw: any): string[] => normalizeStringArray(raw);

function prettyDate(d: string | null | undefined) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return '';
  }
}

type MetricRow = {
  year: string;
  value: number | null;
  unit?: string | null;
  note?: string | null;
};

type MarginRow = {
  type?: string | null;
  year: string;
  value_pct: number | null;
  note?: string | null;
};

function normalizeMetricRows(raw: any): MetricRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: any) => ({
      year: typeof r?.year === 'string' ? r.year : String(r?.year ?? '').trim(),
      value: typeof r?.value === 'number' ? r.value : r?.value === null ? null : Number.isFinite(Number(r?.value)) ? Number(r?.value) : null,
      unit: typeof r?.unit === 'string' ? r.unit : null,
      note: typeof r?.note === 'string' ? r.note : null,
    }))
    .filter((r) => Boolean(r.year))
    .slice(0, 30);
}

function normalizeMarginRows(raw: any): MarginRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: any) => ({
      type: typeof r?.type === 'string' ? r.type : null,
      year: typeof r?.year === 'string' ? r.year : String(r?.year ?? '').trim(),
      value_pct: typeof r?.value_pct === 'number' ? r.value_pct : r?.value_pct === null ? null : Number.isFinite(Number(r?.value_pct)) ? Number(r?.value_pct) : null,
      note: typeof r?.note === 'string' ? r.note : null,
    }))
    .filter((r) => Boolean(r.year))
    .slice(0, 60);
}

function formatMoney(v: number | null | undefined) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  } catch {
    return `$${Math.round(v).toLocaleString()}`;
  }
}

function formatPct(v: number | null | undefined) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  return `${v.toFixed(1)}%`;
}

function sortYearsLikeHuman(a: string, b: string) {
  // try numeric year sort, fallback alpha
  const an = parseInt(a, 10);
  const bn = parseInt(b, 10);
  const aOk = Number.isFinite(an) && String(an) === a.trim();
  const bOk = Number.isFinite(bn) && String(bn) === b.trim();
  if (aOk && bOk) return an - bn;
  return a.localeCompare(b);
}

// ====================================================================================
// Small shared visual helpers
// ====================================================================================
function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;

  const label =
    source === 'on_market'
      ? 'On-market'
      : source === 'off_market'
      ? 'Off-market'
      : source === 'cim_pdf'
      ? 'CIM (PDF)'
      : source === 'financials'
      ? 'Financials'
      : source;

  const tone =
    source === 'on_market'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/40'
      : source === 'off_market'
      ? 'bg-sky-500/10 text-sky-600 border-sky-500/40'
      : source === 'financials'
      ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/40'
      : 'bg-purple-500/10 text-purple-600 border-purple-500/40';

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tone}`}>
      {label}
    </span>
  );
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide bg-amber-500/5 border-amber-500/40 text-amber-700">
      Tier {tier}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string | null | undefined }) {
  if (!confidence) return null;

  const raw = String(confidence).trim();
  const lower = raw.toLowerCase();

  // Decide tone by worst-sounding term present
  const isWeak =
    lower.includes(" low") ||
    lower.includes(":low") ||
    lower.includes("weak") ||
    lower.includes("poor");

  const isMedium =
    lower.includes(" medium") ||
    lower.includes(":medium") ||
    lower.includes("mixed") ||
    lower.includes("moderate");

  const tone = isWeak
    ? "bg-red-500/10 text-red-700 border-red-500/40"
    : isMedium
    ? "bg-amber-500/10 text-amber-700 border-amber-500/40"
    : "bg-emerald-500/10 text-emerald-700 border-emerald-500/40";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {raw}
    </span>
  );
}

// ====================================================================================
// Page
// ====================================================================================
export default function DealDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const id = (params?.id as string | undefined) ?? undefined;

  // support both query names
  const fromView = searchParams.get('from_view') || searchParams.get('from') || searchParams.get('view') || null;
  const backHref = fromView ? `/dashboard?view=${encodeURIComponent(fromView)}` : '/dashboard';

  const [deal, setDeal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // On-market AI states
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false);

  // Off-market AI states
  const [runningOffMarketDD, setRunningOffMarketDD] = useState(false);
  const [offMarketError, setOffMarketError] = useState<string | null>(null);

  // CIM AI states
  const [processingCim, setProcessingCim] = useState(false);
  const [cimError, setCimError] = useState<string | null>(null);
  const [cimSuccess, setCimSuccess] = useState(false);

  // Financials AI states
  const [finLoading, setFinLoading] = useState(false);
  const [finRunning, setFinRunning] = useState(false);
  const [finError, setFinError] = useState<string | null>(null);
  const [finAnalysis, setFinAnalysis] = useState<any | null>(null);

  const fetchLatestFinancialAnalysis = async (dealId: string) => {
    setFinLoading(true);
    setFinError(null);

    const { data, error } = await supabase
      .from('financial_analyses')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error loading financial analysis:', error);
      setFinAnalysis(null);
      setFinError('Failed to load financial analysis.');
      setFinLoading(false);
      return;
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    setFinAnalysis(row);
    setFinLoading(false);
  };

  // ------------------------------------------------------------------------------------
  // Load deal from Supabase
  // ------------------------------------------------------------------------------------
  useEffect(() => {
    if (!id) return;

    const loadDeal = async () => {
      setLoading(true);
      setAiError(null);
      setOffMarketError(null);
      setCimError(null);
      setCimSuccess(false);

      setFinError(null);
      setFinAnalysis(null);

      const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();

      if (error) {
        console.error('Error loading deal:', error);
        setDeal(null);
        setLoading(false);
        return;
      }

      setDeal(data);
      setLoading(false);

      // If it's a financials deal, load latest analysis (if any)
      if (data?.source_type === 'financials') {
        await fetchLatestFinancialAnalysis(id);
      }
    };

    loadDeal();
  }, [id]);

  // ------------------------------------------------------------------------------------
  // On-market: Run Initial Diligence (listing-text based)
  // ------------------------------------------------------------------------------------
  const runOnMarketInitialDiligence = async () => {
    if (!id || !deal) return;

    if (deal.source_type !== 'on_market') {
      setAiError('Initial diligence (on-market) can only run for on-market deals.');
      return;
    }

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

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // non-json response
      }

      if (!res.ok || !json?.ai_summary) {
        console.error('analyze status:', res.status);
        console.error('analyze raw:', text);
        throw new Error(json?.error || `Failed to run on-market diligence (HTTP ${res.status})`);
      }

      const { ai_summary, ai_red_flags, financials, scoring, criteria_match } = json;

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

      if (updateError) throw new Error('Failed to save AI result: ' + updateError.message);

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
      console.error('runOnMarketInitialDiligence error', err);
      setAiError(err?.message || 'Something went wrong running AI.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ✅ Auto-run ONLY for on-market deals (only once)
  useEffect(() => {
    if (deal && deal.source_type === 'on_market' && !deal.ai_summary && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      runOnMarketInitialDiligence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal]);

// ------------------------------------------------------------------------------------
// Off-market: Run Initial Diligence (WEBSITE-BASED)
// ------------------------------------------------------------------------------------
const runOffMarketInitialDiligence = async () => {
  if (!id || !deal) return;

  if (deal.source_type !== 'off_market') {
    setOffMarketError('Initial diligence (off-market) can only run for off-market companies.');
    return;
  }

  setRunningOffMarketDD(true);
  setOffMarketError(null);

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not signed in.');

    const website = deal.website ?? null;
    if (!website) {
      throw new Error(
        'Missing website for this off-market company. Add a website before running diligence.'
      );
    }

    const res = await fetch('/api/off-market/diligence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        companyId: id,
        website,
        force: true,
      }),
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-json response
    }

    if (!res.ok || !json?.success) {
      console.error('diligence status:', res.status);
      console.error('diligence raw:', text);
      throw new Error(json?.error || `Failed to run initial diligence (HTTP ${res.status})`);
    }

    const ai_summary = json.ai_summary ?? '';
    const ai_red_flags = json.ai_red_flags ?? [];
    const financials = json.financials ?? {};
    const scoring = json.scoring ?? {};
    const criteria_match = json.criteria_match ?? {};

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
      throw new Error('Failed to save diligence: ' + updateError.message);
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
  } catch (e: any) {
    console.error('runOffMarketInitialDiligence error:', e);
    setOffMarketError(e?.message || 'Failed to run initial diligence.');
  } finally {
    setRunningOffMarketDD(false);
  }
};

  // ------------------------------------------------------------------------------------
  // CIM: Run AI on PDF
  // ------------------------------------------------------------------------------------
  const runCimAnalysis = async () => {
    if (!id || !deal) return;

    if (deal.source_type !== 'cim_pdf') {
      setCimError('CIM analysis can only run for CIM (PDF) deals.');
      return;
    }

    const cimStoragePath = deal.cim_storage_path as string | null | undefined;
    if (!cimStoragePath) {
      setCimError('Missing cim_storage_path on this company row. Re-upload the CIM or fix the stored path.');
      return;
    }

    setProcessingCim(true);
    setCimError(null);
    setCimSuccess(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch('/api/process-cim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId: id,
          cimStoragePath,
          companyName: deal.company_name ?? null,
        }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok || !json?.success) {
        console.error('process-cim status:', res.status);
        console.error('process-cim raw:', text);
        throw new Error(json?.error || `Failed to process CIM (HTTP ${res.status}).`);
      }

      const { data: refreshed } = await supabase.from('companies').select('*').eq('id', id).single();
      if (refreshed) setDeal(refreshed);

      setCimSuccess(true);
    } catch (e: any) {
      console.error('runCimAnalysis error:', e);
      setCimError(e?.message || 'Failed to process CIM.');
    } finally {
      setProcessingCim(false);
    }
  };

  // ------------------------------------------------------------------------------------
  // Financials: Run AI from Deal page (NO UPLOAD HERE)
  // ------------------------------------------------------------------------------------
  const runFinancialAnalysis = async () => {
    if (!id || !deal) return;

    if (deal.source_type !== 'financials') {
      setFinError('Financial analysis can only run for Financials deals.');
      return;
    }

    if (!deal.financials_storage_path) {
      setFinError('No financials file attached to this deal. Re-upload financials from the Dashboard.');
      return;
    }

    setFinRunning(true);
    setFinError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch('/api/process-financials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deal_id: id }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok || !json?.ok) {
        console.error('process-financials status:', res.status);
        console.error('process-financials raw:', text);
        throw new Error(json?.error || `Financial analysis failed (HTTP ${res.status}).`);
      }

      await fetchLatestFinancialAnalysis(id);
    } catch (e: any) {
      console.error('runFinancialAnalysis error:', e);
      setFinError(e?.message || 'Failed to run financial analysis.');
    } finally {
      setFinRunning(false);
    }
  };

  // ------------------------------------------------------------------------------------
  // Page states
  // ------------------------------------------------------------------------------------
  if (!id) return <main className="py-10 text-center">Loading deal…</main>;
  if (loading) return <main className="py-10 text-center">Loading deal details…</main>;
  if (!deal) return <main className="py-10 text-center text-red-600">Deal not found.</main>;

  // Branch: Financials vs CIM vs Off-market vs On-market
  if (deal.source_type === 'financials') {
    return (
      <FinancialsDealView
        deal={deal}
        onBack={() => router.push(backHref)}
        loadingAnalysis={finLoading}
        running={finRunning}
        analysis={finAnalysis}
        error={finError}
        onRun={runFinancialAnalysis}
      />
    );
  }

  if (deal.source_type === 'cim_pdf') {
    return (
      <CimDealView
        deal={deal}
        onBack={() => router.push(backHref)}
        processingCim={processingCim}
        cimError={cimError}
        cimSuccess={cimSuccess}
        onRunCim={runCimAnalysis}
      />
    );
  }

  if (deal.source_type === 'off_market') {
    return (
      <OffMarketDealView
        deal={deal}
        onBack={() => router.push(backHref)}
        running={runningOffMarketDD}
        error={offMarketError}
        onRunInitialDiligence={runOffMarketInitialDiligence}
      />
    );
  }

  return (
    <OnMarketDealView
      deal={deal}
      onBack={() => router.push(backHref)}
      analyzing={analyzing}
      aiError={aiError}
      onRunInitialDiligence={runOnMarketInitialDiligence}
    />
  );
}

// ====================================================================================
// FINANCIALS DEAL VIEW
// ====================================================================================
function FinancialsDealView({
  deal,
  onBack,
  loadingAnalysis,
  running,
  analysis,
  error,
  onRun,
}: {
  deal: any;
  onBack: () => void;
  loadingAnalysis: boolean;
  running: boolean;
  analysis: any | null;
  error: string | null;
  onRun: () => void;
}) {
  const createdLabel = deal.created_at ? new Date(deal.created_at).toLocaleDateString() : null;

  const confidence = analysis?.overall_confidence ?? null;
  const redFlags = normalizeStringArray(analysis?.red_flags);
  const greenFlags = normalizeStringArray(analysis?.green_flags);
  const missingItems = normalizeStringArray(analysis?.missing_items);
  const diligenceNotes = normalizeStringArray(analysis?.diligence_notes);

  const extracted = analysis?.extracted_metrics ?? null;
  const yoy = normalizeStringArray(extracted?.yoy_trends);

  const revenueRows = normalizeMetricRows(extracted?.revenue);
  const ebitdaRows = normalizeMetricRows(extracted?.ebitda);
  const netIncomeRows = normalizeMetricRows(extracted?.net_income);
  const marginRows = normalizeMarginRows(extracted?.margins);

  const allYears = Array.from(
    new Set([
      ...revenueRows.map((r) => r.year),
      ...ebitdaRows.map((r) => r.year),
      ...netIncomeRows.map((r) => r.year),
      ...marginRows.map((m) => m.year),
    ])
  ).sort(sortYearsLikeHuman);

  const yearToRevenue = new Map(revenueRows.map((r) => [r.year, r]));
  const yearToEbitda = new Map(ebitdaRows.map((r) => [r.year, r]));
  const yearToNet = new Map(netIncomeRows.map((r) => [r.year, r]));

  // pick up to 2 common margin types to display as rows (avoid overbuilding)
  const marginTypes = Array.from(new Set(marginRows.map((m) => (m.type || 'unknown').trim()))).filter(Boolean).slice(0, 2);
  const marginsByTypeYear = new Map<string, Map<string, MarginRow>>();
  for (const mt of marginTypes) {
    marginsByTypeYear.set(mt, new Map(marginRows.filter((m) => (m.type || 'unknown').trim() === mt).map((m) => [m.year, m])));
  }

  const fileName = (deal.financials_filename as string | null) || null;

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
        <button onClick={onBack} className="text-xs underline">
          ← Back to dashboard
        </button>

        <section>
          <h1 className="text-3xl font-semibold mb-1">{deal.company_name || 'Financials'}</h1>
          <p className="text-sm text-muted-foreground">
            Run a financial quality analysis (risks, strengths, missing items). Results save to the deal and can be re-run anytime.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <SourceBadge source={deal.source_type} />
            {createdLabel && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                Added {createdLabel}
              </span>
            )}
            <ConfidenceBadge confidence={confidence} />
            {fileName && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                File: {fileName}
              </span>
            )}
          </div>
        </section>

        <section className="card-section">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Financial Analysis</h2>
              <p className="text-xs text-muted-foreground">Click to run AI on the uploaded financials attached to this deal.</p>
            </div>

            <button onClick={onRun} disabled={running} className="text-xs px-3 py-1 border rounded">
              {running ? 'Running…' : analysis ? 'Re-run Financial Analysis' : 'Run Financial Analysis'}
            </button>
          </div>

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

          {loadingAnalysis ? (
            <p className="text-sm mt-3">Loading analysis…</p>
          ) : !analysis ? (
            <p className="text-sm mt-3">No analysis yet. Click “Run Financial Analysis” to generate results.</p>
          ) : null}
        </section>

        {analysis && (
          <>
            <section className="card-section">
              <h2 className="text-lg font-semibold mb-2">Overall Confidence</h2>
              {confidence ? (
                <p className="text-sm">Confidence level: <span className="font-medium">{confidence}</span></p>
              ) : (
                <p className="text-sm">No confidence level returned.</p>
              )}
            </section>

            {yoy.length > 0 && (
              <section className="card-section">
                <h2 className="text-lg font-semibold mb-2">YoY Trends</h2>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {yoy.slice(0, 20).map((t: string, idx: number) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="card-red">
              <h2 className="text-lg font-semibold mb-2">Red Flags</h2>
              {redFlags.length === 0 ? (
                <p className="text-sm">No red flags returned.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {redFlags.map((x, idx) => (
                    <li key={idx}>{x}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card-section">
              <h2 className="text-lg font-semibold mb-2">Green Flags</h2>
              {greenFlags.length === 0 ? (
                <p className="text-sm">No green flags returned.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {greenFlags.map((x, idx) => (
                    <li key={idx}>{x}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card-section">
              <h2 className="text-lg font-semibold mb-2">Missing / Unclear Items</h2>
              {missingItems.length === 0 ? (
                <p className="text-sm">Nothing flagged as missing or unclear.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {missingItems.map((x, idx) => (
                    <li key={idx}>{x}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card-section">
              <h2 className="text-lg font-semibold mb-2">Notes for Diligence</h2>
              {diligenceNotes.length === 0 ? (
                <p className="text-sm">No diligence notes returned.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {diligenceNotes.map((x, idx) => (
                    <li key={idx}>{x}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card-section">
              <h2 className="text-lg font-semibold mb-2">Key Metrics</h2>

              {allYears.length === 0 ? (
                <p className="text-sm">No structured metrics extracted.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="table-header">
                      <tr>
                        <th className="px-2 py-2 font-medium">Metric</th>
                        {allYears.map((y) => (
                          <th key={y} className="px-2 py-2 font-medium">
                            {y}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="table-row">
                        <td className="px-2 py-2 font-medium">Revenue</td>
                        {allYears.map((y) => (
                          <td key={y} className="px-2 py-2">
                            {formatMoney(yearToRevenue.get(y)?.value ?? null)}
                          </td>
                        ))}
                      </tr>

                      <tr className="table-row">
                        <td className="px-2 py-2 font-medium">EBITDA</td>
                        {allYears.map((y) => (
                          <td key={y} className="px-2 py-2">
                            {formatMoney(yearToEbitda.get(y)?.value ?? null)}
                          </td>
                        ))}
                      </tr>

                      <tr className="table-row">
                        <td className="px-2 py-2 font-medium">Net Income</td>
                        {allYears.map((y) => (
                          <td key={y} className="px-2 py-2">
                            {formatMoney(yearToNet.get(y)?.value ?? null)}
                          </td>
                        ))}
                      </tr>

                      {marginTypes.map((mt) => {
                        const map = marginsByTypeYear.get(mt);
                        return (
                          <tr key={mt} className="table-row">
                            <td className="px-2 py-2 font-medium">{mt}</td>
                            {allYears.map((y) => (
                              <td key={y} className="px-2 py-2">
                                {formatPct(map?.get(y)?.value_pct ?? null)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

// ====================================================================================
// OFF-MARKET DEAL VIEW (Google Places)
// ====================================================================================
function OffMarketDealView({
  deal,
  onBack,
  running,
  error,
  onRunInitialDiligence,
}: {
  deal: any;
  onBack: () => void;
  running: boolean;
  error: string | null;
  onRunInitialDiligence: () => void;
}) {
  const fin = deal.ai_financials_json || {};
  const scoring = deal.ai_scoring_json || {};
  const criteria = deal.criteria_match_json || {};
  const ownerSignals = criteria?.owner_signals || null;
  const redFlags = normalizeRedFlags(deal.ai_red_flags);

  const createdLabel = deal.created_at ? new Date(deal.created_at).toLocaleDateString() : null;

  const ratingLine =
    deal.rating || deal.ratings_total ? `${deal.rating ?? '—'} (${deal.ratings_total ?? '—'} reviews)` : null;

  const tierReasons: string[] = Array.isArray(deal?.tier_reason?.reasons) ? deal.tier_reason.reasons.map(String) : [];

  const confidencePct =
    ownerSignals && typeof ownerSignals.confidence === 'number' ? Math.round(ownerSignals.confidence * 100) : null;

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
        <button onClick={onBack} className="text-xs underline">
          ← Back to dashboard
        </button>

        <section>
          <h1 className="text-3xl font-semibold mb-1">{deal.company_name || 'Untitled Company'}</h1>

          <p className="text-sm text-muted-foreground">
            {deal.address || ''}
            {deal.website && (
              <>
                {' • '}
                <a href={deal.website} className="underline" target="_blank" rel="noreferrer">
                  Visit website
                </a>
              </>
            )}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <SourceBadge source={deal.source_type} />
            <TierBadge tier={deal.tier || deal.final_tier} />
            {createdLabel && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                Added {createdLabel}
              </span>
            )}
            {ratingLine && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                Google {ratingLine}
              </span>
            )}
          </div>
        </section>

        <section className="card-section">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Initial Diligence</h2>
            <button onClick={onRunInitialDiligence} disabled={running} className="text-xs px-2 py-1 border rounded">
              {running ? 'Running…' : deal.ai_summary ? 'Re-run Initial Diligence' : 'Run Initial Diligence'}
            </button>
          </div>

          {error && <p className="text-xs text-red-500 mb-1">{error}</p>}

          <p className="whitespace-pre-line text-sm leading-relaxed">
            {deal.ai_summary || 'No diligence memo yet. Run Initial Diligence to generate one from the company website.'}
          </p>
        </section>

        {ownerSignals && (
          <section className="card-section">
            <h2 className="text-lg font-semibold mb-2">Owner Signals (Probabilistic)</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase">Likely owner-operated</p>
                <p className="font-medium">
                  {ownerSignals.likely_owner_operated ? 'Yes' : 'No'}
                  {confidencePct !== null && <span className="text-xs text-muted-foreground"> ({confidencePct}%)</span>}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase">Owner named on site</p>
                <p className="font-medium">
                  {ownerSignals.owner_named_on_site ? 'Yes' : 'No'}
                  {ownerSignals.owner_named_on_site && ownerSignals.owner_name ? (
                    <span className="text-xs text-muted-foreground"> — {ownerSignals.owner_name}</span>
                  ) : null}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase">Generation hint</p>
                <p className="font-medium">{ownerSignals.generation_hint || 'unknown'}</p>
              </div>

              <div>
                <p className="text-xs uppercase">Owner dependency risk</p>
                <p className="font-medium">{ownerSignals.owner_dependency_risk || 'Unknown'}</p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs uppercase">Years in business</p>
                <p className="font-medium">{ownerSignals.years_in_business || 'Unknown'}</p>
              </div>
            </div>

            {Array.isArray(ownerSignals.evidence) && ownerSignals.evidence.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase mb-1">Evidence</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {ownerSignals.evidence.slice(0, 6).map((e: string, idx: number) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(ownerSignals.missing_info) && ownerSignals.missing_info.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase mb-1">Missing info</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {ownerSignals.missing_info.slice(0, 6).map((m: string, idx: number) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {tierReasons.length > 0 && (
          <section className="card-section">
            <h2 className="text-lg font-semibold mb-2">Discovery Signals</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {tierReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="card-section">
          <h2 className="text-lg font-semibold mb-3">Financials (if available)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs uppercase">Revenue</p>
              <p className="font-medium">{fin.revenue || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs uppercase">EBITDA</p>
              <p className="font-medium">{fin.ebitda || 'Unknown'}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-section text-sm space-y-4">
            <h2 className="text-lg font-semibold mb-1">Scoring Breakdown</h2>

            {Object.keys(scoring).length === 0 ? (
              <p className="text-sm">No scoring stored yet.</p>
            ) : (
              <>
                {scoring.succession_risk && (
                  <div>
                    <p className="font-semibold">Succession Risk</p>
                    <p>{scoring.succession_risk}</p>
                    <p className="text-xs text-muted-foreground">{scoring.succession_risk_reason}</p>
                  </div>
                )}
                {scoring.industry_fit && (
                  <div>
                    <p className="font-semibold">Industry Fit</p>
                    <p>{scoring.industry_fit}</p>
                    <p className="text-xs text-muted-foreground">{scoring.industry_fit_reason}</p>
                  </div>
                )}
                {scoring.geography_fit && (
                  <div>
                    <p className="font-semibold">Geography Fit</p>
                    <p>{scoring.geography_fit}</p>
                    <p className="text-xs text-muted-foreground">{scoring.geography_fit_reason}</p>
                  </div>
                )}
                {scoring.final_tier && (
                  <div>
                    <p className="font-semibold">Final Tier</p>
                    <p>{scoring.final_tier}</p>
                    <p className="text-xs text-muted-foreground">{scoring.final_tier_reason}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card-section text-sm space-y-3">
            <h2 className="text-lg font-semibold mb-1">Fit with Search Criteria</h2>

            {Object.keys(criteria).length === 0 ? (
              <p className="text-sm">No criteria analysis yet.</p>
            ) : (
              <>
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
              </>
            )}
          </div>
        </section>

        <section className="card-red">
          <h2 className="text-lg font-semibold mb-2">Red Flags</h2>
          {redFlags.length === 0 ? (
            <p className="text-sm">No red flags detected yet.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-sm">
              {redFlags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

// ====================================================================================
// ON-MARKET DEAL VIEW (Chrome extension)
// ====================================================================================
function OnMarketDealView({
  deal,
  onBack,
  analyzing,
  aiError,
  onRunInitialDiligence,
}: {
  deal: any;
  onBack: () => void;
  analyzing: boolean;
  aiError: string | null;
  onRunInitialDiligence: () => void;
}) {
  const scoring = deal.ai_scoring_json || {};
  const fin = deal.ai_financials_json || {};
  const criteria = deal.criteria_match_json || {};
  const redFlags = normalizeRedFlags(deal.ai_red_flags);

  const createdLabel = deal.created_at ? new Date(deal.created_at).toLocaleDateString() : null;

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
        <button onClick={onBack} className="text-xs underline">
          ← Back to dashboard
        </button>

        <section>
          <h1 className="text-3xl font-semibold mb-1">{deal.company_name || 'Untitled Company'}</h1>
          <p className="text-sm text-muted-foreground">
            {deal.location_city && `${deal.location_city}, `}
            {deal.location_state}
            {deal.listing_url && (
              <>
                {' • '}
                <a href={deal.listing_url} className="underline" target="_blank" rel="noreferrer">
                  View listing
                </a>
              </>
            )}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <SourceBadge source={deal.source_type} />
            <TierBadge tier={deal.final_tier} />
            {createdLabel && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                Added {createdLabel}
              </span>
            )}
          </div>
        </section>

        <section className="card-section">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Initial Diligence</h2>
            <button onClick={onRunInitialDiligence} disabled={analyzing} className="text-xs px-2 py-1 border rounded">
              {analyzing ? 'Running…' : deal.ai_summary ? 'Re-run Initial Diligence' : 'Run Initial Diligence'}
            </button>
          </div>

          {aiError && <p className="text-xs text-red-500 mb-1">{aiError}</p>}

          <p className="whitespace-pre-line text-sm leading-relaxed">
            {deal.ai_summary || 'No diligence memo available yet. Run Initial Diligence to generate one.'}
          </p>
        </section>

        <section className="card-section">
          <h2 className="text-lg font-semibold mb-3">Financials</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs uppercase">Revenue</p>
              <p className="font-medium">{deal.revenue || fin.revenue || '—'}</p>
            </div>

            <div>
              <p className="text-xs uppercase">EBITDA</p>
              <p className="font-medium">{deal.ebitda || fin.ebitda || '—'}</p>
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
                <p className="font-medium">{fin.customer_concentration}</p>
              </div>
            )}
          </div>
        </section>

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
                  <p className="text-xs text-muted-foreground">{scoring.succession_risk_reason}</p>
                </div>
              )}

              {scoring.industry_fit && (
                <div>
                  <p className="font-semibold">Industry Fit</p>
                  <p>{scoring.industry_fit}</p>
                  <p className="text-xs text-muted-foreground">{scoring.industry_fit_reason}</p>
                </div>
              )}

              {scoring.geography_fit && (
                <div>
                  <p className="font-semibold">Geography Fit</p>
                  <p>{scoring.geography_fit}</p>
                  <p className="text-xs text-muted-foreground">{scoring.geography_fit_reason}</p>
                </div>
              )}

              {scoring.final_tier && (
                <div className="md:col-span-2">
                  <p className="font-semibold">Final Tier</p>
                  <p>{scoring.final_tier}</p>
                  <p className="text-xs text-muted-foreground">{scoring.final_tier_reason}</p>
                </div>
              )}
            </div>
          )}
        </section>

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

        <section className="card-section">
          <h2 className="text-lg font-semibold mb-3">Fit with Search Criteria</h2>

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
// CIM DEAL VIEW (PDF CIM)
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

  const fin = {
    revenue: finRaw.revenue ?? finRaw.ttm_revenue ?? finRaw.revenue_ttm ?? finRaw.ttmRevenue ?? finRaw.latest_revenue ?? null,
    ebitda: finRaw.ebitda ?? finRaw.ttm_ebitda ?? finRaw.ebitda_ttm ?? finRaw.ttmEbitda ?? finRaw.latest_ebitda ?? null,
    margin: finRaw.ebitda_margin ?? finRaw.ebitda_margin_ttm ?? finRaw.margin ?? finRaw.ebitdaMargin ?? null,
    customer_concentration: finRaw.customer_concentration ?? finRaw.customer_conc ?? finRaw.customer_concentration_summary ?? null,
    revenue_1y_ago: finRaw.revenue_1y_ago ?? finRaw.revenue_last_year ?? finRaw.revenue_fy1 ?? null,
    revenue_2y_ago: finRaw.revenue_2y_ago ?? finRaw.revenue_two_years_ago ?? finRaw.revenue_fy2 ?? null,
    revenue_cagr_3y: finRaw.revenue_cagr_3y ?? finRaw.revenue_3yr_cagr ?? finRaw.revenue_cagr_3yr ?? finRaw.rev_cagr_3y ?? null,
    capex_intensity: finRaw.capex_intensity ?? finRaw.capex_pct_revenue ?? null,
    working_capital_needs: finRaw.working_capital_needs ?? finRaw.working_capital_profile ?? null,
  };

  // ✅ FIX: inline normalization so red flags ALWAYS become an array of bullet items
  const redFlags: string[] = (() => {
    const v = deal?.ai_red_flags;
    if (!v) return [];

    if (Array.isArray(v)) {
      return v
        .map((x) => (typeof x === 'string' ? x.trim() : ''))
        .filter(Boolean);
    }

    if (typeof v === 'string') {
      const raw = v.trim();
      if (!raw) return [];

      // If it's a JSON array string, parse it
      if (raw.startsWith('[') && raw.endsWith(']')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed
              .map((x) => (typeof x === 'string' ? x.trim() : ''))
              .filter(Boolean);
          }
        } catch {
          // fall through to newline split
        }
      }

      // Otherwise split by newline and strip leading bullets/numbers
      return raw
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
        .filter(Boolean);
    }

    // object fallback (just in case)
    if (typeof v === 'object') {
      const maybe = (v as any)?.items ?? (v as any)?.red_flags ?? (v as any)?.ai_red_flags;
      if (maybe) {
        const asStr = Array.isArray(maybe) ? maybe : typeof maybe === 'string' ? maybe : '';
        return Array.isArray(asStr)
          ? asStr.map((x) => String(x).trim()).filter(Boolean)
          : String(asStr)
              .replace(/\r\n/g, '\n')
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
              .map((s) => s.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
              .filter(Boolean);
      }
    }

    return [];
  })();

  const ddChecklist: string[] = Array.isArray(criteria.dd_checklist) ? criteria.dd_checklist.map(String) : [];

  const createdLabel = deal.created_at ? new Date(deal.created_at).toLocaleDateString() : null;

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
        <button onClick={onBack} className="text-xs underline">
          ← Back to dashboard
        </button>

        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold mb-1">{deal.company_name || 'CIM Deal'}</h1>
          <p className="text-sm text-muted-foreground">
            {deal.location_city && `${deal.location_city}, `}
            {deal.location_state || 'Location unknown'}
          </p>

          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <SourceBadge source={deal.source_type} />
            <TierBadge tier={scoring.final_tier || deal.final_tier} />
            {createdLabel && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                Added {createdLabel}
              </span>
            )}
          </div>

          <div className="mt-4 card-section">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">CIM Processing</h2>
                <p className="text-xs text-muted-foreground">Re-run AI analysis on the original CIM PDF.</p>
              </div>
              <button onClick={onRunCim} disabled={processingCim} className="text-xs px-3 py-1 border rounded">
                {processingCim ? 'Processing CIM…' : 'Run AI on CIM'}
              </button>
            </div>

            {cimError && <p className="text-xs text-red-500 mt-1">{cimError}</p>}

            {cimSuccess && <p className="text-xs text-green-600 mt-1">CIM processed successfully. Analysis is up to date.</p>}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-section">
            <h2 className="text-lg font-semibold mb-2">AI Investment Memo (CIM)</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {deal.ai_summary || 'No AI summary available yet. Run AI on CIM to generate an investment memo.'}
            </p>
          </div>

          <div className="card-section space-y-3 text-sm">
            <h2 className="text-lg font-semibold mb-2">Financial Snapshot</h2>

            <div>
              <p className="text-xs uppercase">TTM Revenue</p>
              <p className="font-medium">{fin.revenue || 'Unknown'}</p>
            </div>

            <div>
              <p className="text-xs uppercase">TTM EBITDA</p>
              <p className="font-medium">{fin.ebitda || 'Unknown'}</p>
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
                <p className="font-medium">{fin.revenue_1y_ago}</p>
              </div>
            )}

            {fin.revenue_2y_ago && (
              <div>
                <p className="text-xs uppercase">Revenue (2Y ago)</p>
                <p className="font-medium">{fin.revenue_2y_ago}</p>
              </div>
            )}

            {fin.revenue_cagr_3y && (
              <div>
                <p className="text-xs uppercase">3Y Revenue CAGR</p>
                <p className="font-medium">{fin.revenue_cagr_3y}</p>
              </div>
            )}

            {fin.customer_concentration && (
              <div>
                <p className="text-xs uppercase">Customer Concentration</p>
                <p className="font-medium">{fin.customer_concentration}</p>
              </div>
            )}

            {fin.capex_intensity && (
              <div>
                <p className="text-xs uppercase">Capex Intensity</p>
                <p className="font-medium">{fin.capex_intensity}</p>
              </div>
            )}

            {fin.working_capital_needs && (
              <div>
                <p className="text-xs uppercase">Working Capital</p>
                <p className="font-medium">{fin.working_capital_needs}</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-section text-sm space-y-4">
            <h2 className="text-lg font-semibold mb-1">Scoring Breakdown</h2>

            {scoring.succession_risk && (
              <div>
                <p className="font-semibold">Succession Risk</p>
                <p>{scoring.succession_risk}</p>
                <p className="text-xs text-muted-foreground">{scoring.succession_risk_reason}</p>
              </div>
            )}

            {scoring.industry_fit && (
              <div>
                <p className="font-semibold">Industry Fit</p>
                <p>{scoring.industry_fit}</p>
                <p className="text-xs text-muted-foreground">{scoring.industry_fit_reason}</p>
              </div>
            )}

            {scoring.geography_fit && (
              <div>
                <p className="font-semibold">Geography Fit</p>
                <p>{scoring.geography_fit}</p>
                <p className="text-xs text-muted-foreground">{scoring.geography_fit_reason}</p>
              </div>
            )}

            {scoring.financial_quality && (
              <div>
                <p className="font-semibold">Financial Quality</p>
                <p>{scoring.financial_quality}</p>
                <p className="text-xs text-muted-foreground">{scoring.financial_quality_reason}</p>
              </div>
            )}

            {scoring.final_tier && (
              <div>
                <p className="font-semibold">Final Tier</p>
                <p>{scoring.final_tier}</p>
                <p className="text-xs text-muted-foreground">{scoring.final_tier_reason}</p>
              </div>
            )}
          </div>

          <div className="card-section text-sm space-y-3">
            <h2 className="text-lg font-semibold mb-1">Fit with Search Criteria</h2>

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

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-red">
            <h2 className="text-lg font-semibold mb-2">Red Flags</h2>
            {redFlags.length === 0 ? (
              <p className="text-sm">No explicit red flags list stored yet.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {redFlags.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="card-section">
            <h2 className="text-lg font-semibold mb-2">Due Diligence Checklist</h2>
            {ddChecklist.length === 0 ? (
              <p className="text-sm">No checklist generated yet. Re-run AI on CIM to populate this.</p>
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
