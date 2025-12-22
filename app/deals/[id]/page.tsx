// app/deals/[id]/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '../../supabaseClient';

// ====================================================================================
// Shared helpers (safe, defensive parsing)
// ====================================================================================

// normalize JSON/string/array/object -> string[]
const normalizeStringArray = (raw: any): string[] => {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((x) => (x == null ? '' : String(x)))
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof raw === 'object') {
    const maybe =
      (raw as any)?.items ??
      (raw as any)?.red_flags ??
      (raw as any)?.ai_red_flags ??
      (raw as any)?.flags ??
      null;

    if (maybe != null) return normalizeStringArray(maybe);

    try {
      const vals = Object.values(raw).map((v) => (v == null ? '' : String(v)));
      const cleaned = vals.map((s) => s.trim()).filter(Boolean);
      return cleaned;
    } catch {
      return [];
    }
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    // JSON array string?
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('"[') && trimmed.endsWith(']"'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeStringArray(parsed);
      } catch {
        // fall through
      }
    }

    // Newlines / bullets / numbered lists
    return trimmed
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
      .filter(Boolean);
  }

  const asString = String(raw).trim();
  return asString ? [asString] : [];
};

const normalizeRedFlags = (raw: any): string[] => normalizeStringArray(raw);

function formatMoney(v: number | null | undefined) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `$${Math.round(v).toLocaleString()}`;
  }
}

function formatPct(v: number | null | undefined) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  return `${v.toFixed(1)}%`;
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
      value:
        typeof r?.value === 'number'
          ? r.value
          : r?.value === null
          ? null
          : Number.isFinite(Number(r?.value))
          ? Number(r?.value)
          : null,
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
      value_pct:
        typeof r?.value_pct === 'number'
          ? r.value_pct
          : r?.value_pct === null
          ? null
          : Number.isFinite(Number(r?.value_pct))
          ? Number(r?.value_pct)
          : null,
      note: typeof r?.note === 'string' ? r.note : null,
    }))
    .filter((r) => Boolean(r.year))
    .slice(0, 60);
}

function sortYearsLikeHuman(a: string, b: string) {
  const an = parseInt(a, 10);
  const bn = parseInt(b, 10);
  const aOk = Number.isFinite(an) && String(an) === a.trim();
  const bOk = Number.isFinite(bn) && String(bn) === b.trim();
  if (aOk && bOk) return an - bn;
  return a.localeCompare(b);
}

function safeDateLabel(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return null;
  }
}

function firstSentence(text: string | null | undefined): string {
  const t = (text || '').trim();
  if (!t) return '';
  const idx = t.search(/[.!?]\s/);
  if (idx === -1) return t.slice(0, 180);
  return t.slice(0, idx + 1).trim();
}

// ====================================================================================
// Confidence (single-source-of-truth for Deal page)
// ====================================================================================
type ConfidenceLevel = 'low' | 'medium' | 'high';

type AIConfidence = {
  level?: ConfidenceLevel | null;
  icon?: '⚠️' | '◑' | '●' | null;
  summary?: string | null; // one-line reason
  signals?: Array<{ label: string; value: string }> | null;
  source?: string | null;
  updated_at?: string | null;
} | null;

function normalizeConfidence(
  ai: AIConfidence
): { icon: '⚠️' | '◑' | '●'; label: string; reason: string; analyzed: boolean; level?: ConfidenceLevel } | null {
  if (!ai) return null;

  const lvl = (ai.level || '').toLowerCase() as ConfidenceLevel;
  const iconFromLevel: Record<ConfidenceLevel, '⚠️' | '◑' | '●'> = {
    low: '⚠️',
    medium: '◑',
    high: '●',
  };

  const icon = (ai.icon as any) || iconFromLevel[lvl] || '◑';
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

function normalizeFinancialsConfidence(raw: any): { icon: '⚠️' | '◑' | '●'; label: string; reason: string } | null {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return null;
  const lower = s.toLowerCase();

  // Accept inputs like: "Operational Performance: Mixed | Financial Controls: Weak"
  let level: ConfidenceLevel = 'medium';
  if (lower.includes('weak') || lower.includes('low') || lower.includes('poor')) level = 'low';
  if (lower.includes('strong') || lower.includes('high') || lower.includes('good')) level = 'high';
  if (lower.includes('mixed') || lower.includes('medium') || lower.includes('moderate')) level = 'medium';

  const icon: '⚠️' | '◑' | '●' = level === 'low' ? '⚠️' : level === 'high' ? '●' : '◑';
  const label = `Data confidence: ${level === 'high' ? 'High' : level === 'low' ? 'Low' : 'Medium'}`;
  return { icon, label, reason: 'Derived from latest Financial Analysis output.' };
}

function getDealConfidence(
  deal: any,
  opts?: { financialAnalysis?: any | null }
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

function ConfidencePill({
  icon,
  label,
  title,
  analyzed,
  level,
}: {
  icon: '⚠️' | '◑' | '●';
  label: string;
  title: string;
  analyzed?: boolean;
  level?: ConfidenceLevel;
}) {
  const base = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium';

  // Not analyzed: neutral gray (distinct)
  const cls =
    analyzed === false
      ? `${base} border-slate-500/30 bg-transparent text-slate-500`
      : icon === '⚠️' || level === 'low'
      ? `${base} border-red-500/40 bg-red-500/5 text-red-700`
      : icon === '●' || level === 'high'
      ? `${base} border-emerald-500/40 bg-emerald-500/5 text-emerald-700`
      : `${base} border-blue-500/40 bg-blue-500/5 text-blue-700`;

  return (
    <span className={cls} title={title}>
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

// ====================================================================================
// Data Confidence signals grid (shared mental model)
// ====================================================================================
type ConfidenceSignal = { label: string; value: string };

function parseSignalLine(line: string): ConfidenceSignal | null {
  const s = (line || '').trim();
  if (!s) return null;

  // Try "Label: Value"
  const idx = s.indexOf(':');
  if (idx > 0 && idx < s.length - 1) {
    const label = s.slice(0, idx).trim();
    const value = s.slice(idx + 1).trim();
    if (label && value) return { label, value };
  }

  // Try "Label — Value" / "Label - Value"
  const dash = s.split(/\s—\s|\s-\s/);
  if (dash.length >= 2) {
    const label = dash[0].trim();
    const value = dash.slice(1).join(' - ').trim();
    if (label && value) return { label, value };
  }

  // Fallback: treat as a statement
  return { label: 'Signal', value: s };
}

function normalizeConfidenceSignals(raw: any): ConfidenceSignal[] {
  if (!raw) return [];

  // If already array of {label,value}
  if (Array.isArray(raw)) {
    const out: ConfidenceSignal[] = [];
    for (const item of raw) {
      if (item && typeof item === 'object') {
        const label = String((item as any).label ?? '').trim();
        const value = String((item as any).value ?? '').trim();
        if (label && value) out.push({ label, value });
        continue;
      }
      const parsed = parseSignalLine(String(item ?? ''));
      if (parsed) out.push(parsed);
    }
    return out.slice(0, 12);
  }

  // Support bullets string/object
  const bullets = normalizeStringArray(raw);
  return bullets.map((b) => parseSignalLine(b)).filter(Boolean).slice(0, 12) as ConfidenceSignal[];
}

function SignalsGrid({ signals }: { signals: ConfidenceSignal[] }) {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs uppercase opacity-70 mb-2">Signals</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {signals.slice(0, 8).map((s, idx) => (
          <div key={idx} className="rounded-lg border px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide opacity-70">{s.label}</div>
            <div className="text-sm font-medium">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
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
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tone}`}
    >
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

function EmptyCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="card-section">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PlaceholderList({ emptyText }: { emptyText: string }) {
  return <p className="text-sm opacity-80">{emptyText}</p>;
}

// ====================================================================================
// Page
// ====================================================================================
export default function DealDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const id = (params?.id as string | undefined) ?? undefined;

  // support multiple query names
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

  // Save toggle (optional – will work if companies has is_saved boolean)
  const [savingToggle, setSavingToggle] = useState(false);
  const canToggleSave = useMemo(() => deal && typeof deal?.is_saved === 'boolean', [deal]);

  const refreshDeal = async (dealId: string) => {
    const { data, error } = await supabase.from('companies').select('*').eq('id', dealId).single();
    if (error) {
      console.error('refreshDeal error:', error);
      return null;
    }
    setDeal(data);
    return data;
  };

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

      if (data?.source_type === 'financials') {
        await fetchLatestFinancialAnalysis(id);
      }
    };

    loadDeal();
  }, [id]);

  // ------------------------------------------------------------------------------------
  // Save / Unsave
  // ------------------------------------------------------------------------------------
  const toggleSaved = async () => {
    if (!id || !deal) return;
    if (!canToggleSave) return;

    setSavingToggle(true);
    try {
      const next = !deal.is_saved;
      const { error } = await supabase.from('companies').update({ is_saved: next }).eq('id', id);
      if (error) throw error;
      setDeal((prev: any) => (prev ? { ...prev, is_saved: next } : prev));
    } catch (e: any) {
      console.error('toggleSaved error:', e);
    } finally {
      setSavingToggle(false);
    }
  };

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
      } catch {}

      if (!res.ok || !json?.ai_summary) {
        console.error('analyze status:', res.status);
        console.error('analyze raw:', text);
        throw new Error(json?.error || `Failed to run on-market diligence (HTTP ${res.status})`);
      }

      const { ai_summary, ai_red_flags, financials, scoring, criteria_match, ai_confidence_json } = json;

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          ai_summary,
          ai_red_flags,
          ai_financials_json: financials,
          ai_scoring_json: scoring,
          criteria_match_json: criteria_match,
          // optional: if your route returns it (safe to ignore if undefined)
          ...(ai_confidence_json ? { ai_confidence_json } : {}),
        })
        .eq('id', id);

      if (updateError) throw new Error('Failed to save AI result: ' + updateError.message);

      await refreshDeal(id);
    } catch (err: any) {
      console.error('runOnMarketInitialDiligence error', err);
      setAiError(err?.message || 'Something went wrong running AI.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Auto-run ONLY for on-market deals (only once)
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
      if (!website) throw new Error('Missing website for this off-market company. Add a website before running diligence.');

      const res = await fetch('/api/off-market/diligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: id, website, force: true }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}

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
      const ai_confidence_json = json.ai_confidence_json ?? null;

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          ai_summary,
          ai_red_flags,
          ai_financials_json: financials,
          ai_scoring_json: scoring,
          criteria_match_json: criteria_match,
          ...(ai_confidence_json ? { ai_confidence_json } : {}),
        })
        .eq('id', id);

      if (updateError) throw new Error('Failed to save diligence: ' + updateError.message);

      await refreshDeal(id);
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: id, cimStoragePath, companyName: deal.company_name ?? null }),
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

      await refreshDeal(id);
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

      await refreshDeal(id);
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
        canToggleSave={canToggleSave}
        savingToggle={savingToggle}
        onToggleSave={toggleSaved}
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
        canToggleSave={canToggleSave}
        savingToggle={savingToggle}
        onToggleSave={toggleSaved}
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
        canToggleSave={canToggleSave}
        savingToggle={savingToggle}
        onToggleSave={toggleSaved}
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
      canToggleSave={canToggleSave}
      savingToggle={savingToggle}
      onToggleSave={toggleSaved}
    />
  );
}

// ====================================================================================
// Shared header row for views
// ====================================================================================
function HeaderActions({
  deal,
  rightSlot,
  canToggleSave,
  savingToggle,
  onToggleSave,
  financialAnalysis,
}: {
  deal: any;
  rightSlot?: React.ReactNode;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
  financialAnalysis?: any | null;
}) {
  const isTierSource = deal?.source_type === 'on_market' || deal?.source_type === 'off_market';
  const tier = isTierSource ? ((deal?.final_tier as string | null) || null) : null;

  const confidence = getDealConfidence(deal, { financialAnalysis: financialAnalysis ?? null });
  const addedLabel = safeDateLabel(deal.created_at);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={deal.source_type} />

        {/* Tier only for On/Off-market */}
        {isTierSource ? <TierBadge tier={tier} /> : null}

        {/* Data confidence everywhere (CIM/Financials main priority) */}
        <ConfidencePill
          icon={confidence.icon}
          label={confidence.label}
          title={confidence.reason}
          analyzed={confidence.analyzed}
          level={confidence.level}
        />

        {addedLabel ? (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
            Added {addedLabel}
          </span>
        ) : null}

        {deal.source_type === 'financials' && deal.financials_filename ? (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
            File: {deal.financials_filename}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {rightSlot}
        {canToggleSave ? (
          <button
            onClick={onToggleSave}
            disabled={savingToggle}
            className="text-xs px-3 py-1 border rounded"
            title="Save/Unsave deal"
          >
            {savingToggle ? 'Saving…' : deal.is_saved ? 'Saved ✓' : 'Save'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ====================================================================================
// FINANCIALS DEAL VIEW (Snapshot removed)
// ====================================================================================
function FinancialsDealView({
  deal,
  onBack,
  loadingAnalysis,
  running,
  analysis,
  error,
  onRun,
  canToggleSave,
  savingToggle,
  onToggleSave,
}: {
  deal: any;
  onBack: () => void;
  loadingAnalysis: boolean;
  running: boolean;
  analysis: any | null;
  error: string | null;
  onRun: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
}) {
  const confidence = getDealConfidence(deal, { financialAnalysis: analysis });

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

  const marginTypes = Array.from(new Set(marginRows.map((m) => (m.type || 'unknown').trim())))
    .filter(Boolean)
    .slice(0, 2);

  const marginsByTypeYear = new Map<string, Map<string, MarginRow>>();
  for (const mt of marginTypes) {
    marginsByTypeYear.set(
      mt,
      new Map(
        marginRows
          .filter((m) => (m.type || 'unknown').trim() === mt)
          .map((m) => [m.year, m])
      )
    );
  }

  const hasAnyAnalysis = Boolean(analysis);
  const showLoadingLine = loadingAnalysis && !hasAnyAnalysis;

  // Signals source order:
  // 1) companies.ai_confidence_json.signals (preferred)
  // 2) financial_analyses.confidence_json.signals
  // 3) financial_analyses.confidence_json.bullets (fallback)
  const signals = useMemo(() => {
    const fromDeal = normalizeConfidenceSignals(deal?.ai_confidence_json?.signals ?? null);
    if (fromDeal.length > 0) return fromDeal;

    const fromSignals = normalizeConfidenceSignals(analysis?.confidence_json?.signals ?? null);
    if (fromSignals.length > 0) return fromSignals;

    const fromBullets = normalizeConfidenceSignals(analysis?.confidence_json?.bullets ?? null);
    return fromBullets;
  }, [deal?.ai_confidence_json?.signals, analysis?.confidence_json?.signals, analysis?.confidence_json?.bullets]);

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
        <button onClick={onBack} className="text-xs underline">
          ← Back to dashboard
        </button>

        <section>
          <h1 className="text-3xl font-semibold mb-1">{deal.company_name || 'Financials'}</h1>
          <p className="text-sm text-muted-foreground">
            Skeptical read on earnings quality, missing items, and risk signals. Saved to the deal and can be re-run anytime.
          </p>

          <HeaderActions
            deal={deal}
            financialAnalysis={analysis}
            canToggleSave={canToggleSave}
            savingToggle={savingToggle}
            onToggleSave={onToggleSave}
          />
        </section>

        {/* Run box */}
        <section className="card-section">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Financial Analysis</h2>
              <p className="text-xs text-muted-foreground">Runs AI on the uploaded financials attached to this deal.</p>
            </div>

            <button onClick={onRun} disabled={running} className="text-xs px-3 py-1 border rounded">
              {running ? 'Running…' : analysis ? 'Re-run Financial Analysis' : 'Run Financial Analysis'}
            </button>
          </div>

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

          {showLoadingLine ? <p className="text-sm mt-3">Loading analysis…</p> : null}

          {!hasAnyAnalysis ? (
            <p className="text-sm mt-3 opacity-80">
              No analysis yet. Click “Run Financial Analysis” to generate outputs and populate sections below.
            </p>
          ) : null}
        </section>

        {/* ✅ Snapshot removed. Confidence becomes full-width. */}
        <section className="card-section">
          <h2 className="text-lg font-semibold mb-2">Data Confidence & Read Quality</h2>

          <div className="flex flex-wrap items-center gap-2">
            <ConfidencePill
              icon={confidence.icon}
              label={confidence.label}
              title={confidence.reason}
              analyzed={confidence.analyzed}
              level={confidence.level}
            />
          </div>

          {/* Signals grid (CIM-style sibling UI) */}
          {hasAnyAnalysis ? (
            signals.length === 0 ? (
              <p className="mt-3 text-sm opacity-80">No confidence signals returned.</p>
            ) : (
              <SignalsGrid signals={signals} />
            )
          ) : (
            <p className="mt-3 text-sm opacity-80">Run Financial Analysis to generate read-quality signals.</p>
          )}
        </section>

        <EmptyCard title="YoY Trends">
          {hasAnyAnalysis ? (
            yoy.length === 0 ? (
              <PlaceholderList emptyText="No YoY trends returned." />
            ) : (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {yoy.slice(0, 20).map((t: string, idx: number) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            )
          ) : (
            <PlaceholderList emptyText="YoY trends will appear here after you run Financial Analysis." />
          )}
        </EmptyCard>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card-red">
            <h2 className="text-lg font-semibold mb-2">Red Flags</h2>
            {hasAnyAnalysis ? (
              redFlags.length === 0 ? (
                <p className="text-sm">No red flags returned.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {redFlags.map((x, idx) => (
                    <li key={idx}>{x}</li>
                  ))}
                </ul>
              )
            ) : (
              <p className="text-sm opacity-80">Red flags will populate here after you run Financial Analysis.</p>
            )}
          </section>

          <section className="card-section">
            <h2 className="text-lg font-semibold mb-2">Green Flags</h2>
            {hasAnyAnalysis ? (
              greenFlags.length === 0 ? (
                <p className="text-sm">No green flags returned.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {greenFlags.map((x, idx) => (
                    <li key={idx}>{x}</li>
                  ))}
                </ul>
              )
            ) : (
              <p className="text-sm opacity-80">Green flags will populate here after you run Financial Analysis.</p>
            )}
          </section>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card-section">
            <h2 className="text-lg font-semibold mb-2">Missing / Unclear Items</h2>
            {hasAnyAnalysis ? (
              missingItems.length === 0 ? (
                <p className="text-sm">Nothing flagged as missing or unclear.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {missingItems.map((x, idx) => (
                    <li key={idx}>{x}</li>
                  ))}
                </ul>
              )
            ) : (
              <p className="text-sm opacity-80">Missing or unclear items will populate here after you run Financial Analysis.</p>
            )}
          </section>

          <section className="card-section">
            <h2 className="text-lg font-semibold mb-2">Due Diligence Checklist</h2>
            {hasAnyAnalysis ? (
              diligenceNotes.length === 0 ? (
                <p className="text-sm">No diligence checklist items returned.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {diligenceNotes.map((x, idx) => (
                    <li key={idx}>{x}</li>
                  ))}
                </ul>
              )
            ) : (
              <p className="text-sm opacity-80">Diligence checklist items will populate here after you run Financial Analysis.</p>
            )}
          </section>
        </section>

        <section className="card-section">
          <h2 className="text-lg font-semibold mb-2">Key Metrics</h2>

          {!hasAnyAnalysis ? (
            <p className="text-sm opacity-80">Key metrics will populate here after you run Financial Analysis.</p>
          ) : allYears.length === 0 ? (
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

        <div className="pt-2 text-[11px] opacity-70">
          SearchFindr surfaces prioritization signals. Final judgment remains with the buyer.
        </div>
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
  canToggleSave,
  savingToggle,
  onToggleSave,
}: {
  deal: any;
  onBack: () => void;
  running: boolean;
  error: string | null;
  onRunInitialDiligence: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
}) {
  const fin = deal.ai_financials_json || {};
  const scoring = deal.ai_scoring_json || {};
  const criteria = deal.criteria_match_json || {};
  const ownerSignals = criteria?.owner_signals || null;
  const redFlags = normalizeRedFlags(deal.ai_red_flags);

  // ✅ Why it matters is the main thing for On/Off-market
  const whyItMatters =
    (criteria?.why_it_matters && String(criteria.why_it_matters).trim()) || firstSentence(deal.ai_summary) || '';

  const ratingLine =
    deal.rating || deal.ratings_total ? `${deal.rating ?? '—'} (${deal.ratings_total ?? '—'} reviews)` : null;

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

          <HeaderActions
            deal={deal}
            canToggleSave={canToggleSave}
            savingToggle={savingToggle}
            onToggleSave={onToggleSave}
            rightSlot={
              ratingLine ? (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                  Google {ratingLine}
                </span>
              ) : null
            }
          />
        </section>

        {whyItMatters ? (
          <section className="card-section">
            <h2 className="text-lg font-semibold mb-1">Why it matters</h2>
            <p className="text-sm opacity-90">{whyItMatters}</p>
            <p className="mt-1 text-[11px] opacity-70">Surface signal from available inputs — verify with outreach + diligence.</p>
          </section>
        ) : null}

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
                <p className="text-xs uppercase">Key-person dependency risk</p>
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
            <p className="text-[11px] opacity-70">
              This is a prioritization view (not a recommendation). Risk signals: High = more risk. Fit/quality signals: High = stronger alignment/quality.
            </p>

            {Object.keys(scoring).length === 0 ? (
              <p className="text-sm">No scoring stored yet.</p>
            ) : (
              <>
                {scoring.succession_risk && (
                  <div>
                    <p className="font-semibold">Key-person risk</p>
                    <p>{scoring.succession_risk}</p>
                    <p className="text-xs text-muted-foreground">{scoring.succession_risk_reason}</p>
                  </div>
                )}
                {scoring.industry_fit && (
                  <div>
                    <p className="font-semibold">Industry alignment</p>
                    <p>{scoring.industry_fit}</p>
                    <p className="text-xs text-muted-foreground">{scoring.industry_fit_reason}</p>
                  </div>
                )}
                {scoring.geography_fit && (
                  <div>
                    <p className="font-semibold">Geographic considerations</p>
                    <p>{scoring.geography_fit}</p>
                    <p className="text-xs text-muted-foreground">{scoring.geography_fit_reason}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card-section text-sm space-y-3">
            <h2 className="text-lg font-semibold mb-1">Searcher Snapshot</h2>

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
  canToggleSave,
  savingToggle,
  onToggleSave,
}: {
  deal: any;
  onBack: () => void;
  analyzing: boolean;
  aiError: string | null;
  onRunInitialDiligence: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
}) {
  const scoring = deal.ai_scoring_json || {};
  const fin = deal.ai_financials_json || {};
  const criteria = deal.criteria_match_json || {};
  const redFlags = normalizeRedFlags(deal.ai_red_flags);

  // ✅ Why it matters is the main thing for On/Off-market
  const whyItMatters =
    (criteria?.why_it_matters && String(criteria.why_it_matters).trim()) || firstSentence(deal.ai_summary) || '';

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

          <HeaderActions deal={deal} canToggleSave={canToggleSave} savingToggle={savingToggle} onToggleSave={onToggleSave} />
        </section>

        {whyItMatters ? (
          <section className="card-section">
            <h2 className="text-lg font-semibold mb-1">Why it matters</h2>
            <p className="text-sm opacity-90">{whyItMatters}</p>
            <p className="mt-1 text-[11px] opacity-70">Surface signal from listing inputs — verify with outreach + diligence.</p>
          </section>
        ) : null}

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
          <p className="text-[11px] opacity-70">
            Prioritization signals (not a recommendation). Risk signals: High = more risk. Fit/quality signals: High = stronger alignment/quality.
          </p>

          {Object.keys(scoring).length === 0 ? (
            <p className="text-sm">No scoring stored yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              {scoring.succession_risk && (
                <div>
                  <p className="font-semibold">Key-person risk</p>
                  <p>{scoring.succession_risk}</p>
                  <p className="text-xs text-muted-foreground">{scoring.succession_risk_reason}</p>
                </div>
              )}

              {scoring.industry_fit && (
                <div>
                  <p className="font-semibold">Industry alignment</p>
                  <p>{scoring.industry_fit}</p>
                  <p className="text-xs text-muted-foreground">{scoring.industry_fit_reason}</p>
                </div>
              )}

              {scoring.geography_fit && (
                <div>
                  <p className="font-semibold">Geographic considerations</p>
                  <p>{scoring.geography_fit}</p>
                  <p className="text-xs text-muted-foreground">{scoring.geography_fit_reason}</p>
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
          <h2 className="text-lg font-semibold mb-3">Searcher Snapshot</h2>

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
  canToggleSave,
  savingToggle,
  onToggleSave,
}: {
  deal: any;
  onBack: () => void;
  processingCim: boolean;
  cimError: string | null;
  cimSuccess: boolean;
  onRunCim: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
}) {
  const scoring = deal.ai_scoring_json || {};
  const criteria = deal.criteria_match_json || {};
  const finRaw = deal.ai_financials_json || {};

  const fin = {
    revenue:
      finRaw.revenue ??
      finRaw.ttm_revenue ??
      finRaw.revenue_ttm ??
      finRaw.ttmRevenue ??
      finRaw.latest_revenue ??
      null,
    ebitda:
      finRaw.ebitda ??
      finRaw.ttm_ebitda ??
      finRaw.ebitda_ttm ??
      finRaw.ttmEbitda ??
      finRaw.latest_ebitda ??
      null,
    margin: finRaw.ebitda_margin ?? finRaw.ebitda_margin_ttm ?? finRaw.margin ?? finRaw.ebitdaMargin ?? null,
    customer_concentration:
      finRaw.customer_concentration ?? finRaw.customer_conc ?? finRaw.customer_concentration_summary ?? null,
    revenue_1y_ago: finRaw.revenue_1y_ago ?? finRaw.revenue_last_year ?? finRaw.revenue_fy1 ?? null,
    revenue_2y_ago: finRaw.revenue_2y_ago ?? finRaw.revenue_two_years_ago ?? finRaw.revenue_fy2 ?? null,
    revenue_cagr_3y:
      finRaw.revenue_cagr_3y ?? finRaw.revenue_3yr_cagr ?? finRaw.revenue_cagr_3yr ?? finRaw.rev_cagr_3y ?? null,
    capex_intensity: finRaw.capex_intensity ?? finRaw.capex_pct_revenue ?? null,
    working_capital_needs: finRaw.working_capital_needs ?? finRaw.working_capital_profile ?? null,
  };

  const redFlags = normalizeRedFlags(deal.ai_red_flags);
  const ddChecklist: string[] = Array.isArray(criteria.dd_checklist) ? criteria.dd_checklist.map(String) : [];

  // ✅ CIM: Data confidence is the primary section
  const confidence = getDealConfidence(deal);

  // ✅ CIM signals MUST use the same grid renderer as Financials
  const signals = useMemo(() => {
    return normalizeConfidenceSignals(deal?.ai_confidence_json?.signals ?? null);
  }, [deal?.ai_confidence_json?.signals]);

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

          {/* Tier suppressed for CIM via HeaderActions */}
          <HeaderActions deal={deal} canToggleSave={canToggleSave} savingToggle={savingToggle} onToggleSave={onToggleSave} />

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

        {/* ✅ Data Confidence (identical component behavior to Financials) */}
        <section className="card-section">
          <h2 className="text-lg font-semibold mb-2">Data Confidence & Read Quality</h2>

          <div className="flex flex-wrap items-center gap-2">
            <ConfidencePill
              icon={confidence.icon}
              label={confidence.label}
              title={confidence.reason}
              analyzed={confidence.analyzed}
              level={confidence.level}
            />
            {deal?.ai_confidence_json?.updated_at ? (
              <span className="text-xs opacity-70">Updated {safeDateLabel(deal.ai_confidence_json.updated_at) || ''}</span>
            ) : null}
          </div>

          {confidence.analyzed ? (
            signals.length === 0 ? (
              <p className="mt-3 text-sm opacity-80">No confidence signals returned.</p>
            ) : (
              <SignalsGrid signals={signals} />
            )
          ) : (
            <p className="mt-3 text-sm opacity-80">Run AI on CIM to generate read-quality signals.</p>
          )}
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
            <h2 className="text-lg font-semibold mb-1">CIM Quality & Risk Signals</h2>
            <p className="text-[11px] opacity-70">
              Interpretation aids from CIM content (not a grade). Risk signals: High = more risk. Quality signals: High = stronger quality. No Tier is produced for CIM uploads.
            </p>

            {Object.keys(scoring).length === 0 ? (
              <p className="text-sm opacity-80">No structured signals stored yet.</p>
            ) : (
              <>
                {scoring.succession_risk && (
                  <div>
                    <p className="font-semibold">Key-person risk</p>
                    <p>{scoring.succession_risk}</p>
                    <p className="text-xs text-muted-foreground">{scoring.succession_risk_reason}</p>
                  </div>
                )}

                {scoring.industry_fit && (
                  <div>
                    <p className="font-semibold">Industry alignment</p>
                    <p>{scoring.industry_fit}</p>
                    <p className="text-xs text-muted-foreground">{scoring.industry_fit_reason}</p>
                  </div>
                )}

                {scoring.geography_fit && (
                  <div>
                    <p className="font-semibold">Geographic considerations</p>
                    <p>{scoring.geography_fit}</p>
                    <p className="text-xs text-muted-foreground">{scoring.geography_fit_reason}</p>
                  </div>
                )}

                {scoring.financial_quality && (
                  <div>
                    <p className="font-semibold">Financial statement quality</p>
                    <p>{scoring.financial_quality}</p>
                    <p className="text-xs text-muted-foreground">{scoring.financial_quality_reason}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card-section text-sm space-y-3">
            <h2 className="text-lg font-semibold mb-1">Searcher Snapshot</h2>

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