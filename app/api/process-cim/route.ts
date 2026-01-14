// app/api/process-cim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, AuthError } from '@/lib/api/auth';

export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set. /api/process-cim will fail until you set it in .env.local');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase server env vars missing. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}

// ✅ Server-side Supabase client (bypasses RLS). Never use this on the client.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Helper: upload PDF bytes to OpenAI Files API and return file_id
async function uploadPdfToOpenAI(pdfArrayBuffer: ArrayBuffer, filename: string) {
  const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('file', pdfBlob, filename || 'cim.pdf');
  formData.append('purpose', 'assistants');

  const res = await fetch(`${OPENAI_BASE_URL}/v1/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('OpenAI file upload error:', errorText);
    throw new Error('Failed to upload CIM PDF to OpenAI');
  }

  const json = await res.json();
  console.log('process-cim: uploaded file id', json.id);
  return json.id as string;
}

function extractOutputText(responsesJson: any): string {
  const t1 = responsesJson?.output_text;
  if (typeof t1 === 'string' && t1.trim()) return t1.trim();

  const out = responsesJson?.output;
  if (Array.isArray(out)) {
    for (const item of out) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        const t = c?.text;
        if (typeof t === 'string' && t.trim()) return t.trim();
      }
    }
  }

  // fallback to your original path (kept)
  const t2 = responsesJson?.output?.[0]?.content?.[0]?.text;
  if (typeof t2 === 'string' && t2.trim()) return t2.trim();

  return '';
}

// ✅ Force bullet formatting no matter what comes back
function coerceRedFlagsToBulletedMarkdown(value: unknown): string | null {
  // Case 1: array of strings
  if (Array.isArray(value)) {
    const items = value
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean)
      .map((s) => s.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
      .filter(Boolean);

    if (items.length === 0) return null;
    return items.map((s) => `- ${s}`).join('\n');
  }

  // Case 2: model returns a string blob
  if (typeof value === 'string' && value.trim()) {
    const raw = value.replace(/\r\n/g, '\n').trim();

    // Split by newline first; if single line, split by sentence-ish boundaries
    let parts = raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length <= 1) {
      parts = raw
        .split(/(?:\.\s+|;\s+|\n+)/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const items = parts
      .map((s) => s.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
      .filter(Boolean);

    if (items.length === 0) return null;
    return items.map((s) => `- ${s}`).join('\n');
  }

  return null;
}

/**
 * ✅ NEW: Data confidence snapshot builder (for companies.ai_confidence_json)
 * This is CONFIDENCE IN INPUTS / DISCLOSURE QUALITY — not "AI confidence".
 */
type DataConfidenceLevel = 'low' | 'medium' | 'high';

function iconForLevel(level: DataConfidenceLevel): '⚠️' | '◑' | '●' {
  if (level === 'high') return '●';
  if (level === 'medium') return '◑';
  return '⚠️';
}

function safeStr(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function normalizeLMH(v: any): 'Low' | 'Medium' | 'High' | 'unknown' {
  const s = safeStr(v).trim();
  if (!s) return 'unknown';
  const t = s.toLowerCase();
  if (t === 'low') return 'Low';
  if (t === 'medium') return 'Medium';
  if (t === 'high') return 'High';
  if (t === 'unknown') return 'unknown';
  return 'unknown';
}

function countUnknownScoringFields(scoring: any): number {
  const fields = [
    scoring?.succession_risk,
    scoring?.industry_fit,
    scoring?.geography_fit,
    scoring?.financial_quality,
    scoring?.revenue_durability,
    scoring?.customer_concentration_risk,
    scoring?.capital_intensity,
    scoring?.deal_complexity,
  ];

  let unknowns = 0;
  for (const f of fields) {
    if (normalizeLMH(f) === 'unknown') unknowns += 1;
  }
  return unknowns;
}

function countRedFlags(parsed: any): number {
  const v = parsed?.ai_red_flags;
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string' && x.trim()).length;
  if (typeof v === 'string' && v.trim()) return v.split('\n').filter(Boolean).length;
  return 0;
}

function buildCimDataConfidence(parsed: any) {
  const scoring = parsed?.scoring ?? {};

  const financialQuality = normalizeLMH(scoring?.financial_quality);
  const revenueDurability = normalizeLMH(scoring?.revenue_durability);
  const customerConc = normalizeLMH(scoring?.customer_concentration_risk);
  const succession = normalizeLMH(scoring?.succession_risk);

  const unknownCount = countUnknownScoringFields(scoring);
  const redFlagsCount = countRedFlags(parsed);

  // Conservative decision logic:
  // - Low if financial quality is Low OR lots of unknowns
  // - High only if financial quality is High AND very few unknowns AND modest red flags
  let level: DataConfidenceLevel = 'medium';
  if (financialQuality === 'Low' || unknownCount >= 3) level = 'low';
  if (financialQuality === 'High' && unknownCount <= 1 && redFlagsCount <= 4) level = 'high';

  // One-line reason (data confidence wording)
  let summaryReason = 'inputs require verification';
  if (financialQuality === 'Low') summaryReason = 'financial disclosures appear inconsistent or heavily adjusted';
  else if (unknownCount >= 3) summaryReason = 'material disclosures are missing or unclear';
  else if (level === 'high') summaryReason = 'disclosures appear internally consistent with reasonable detail';

  const summary =
    level === 'high'
      ? `High data confidence — ${summaryReason}.`
      : level === 'medium'
      ? `Medium data confidence — ${summaryReason}.`
      : `Low data confidence — ${summaryReason}.`;

  const signals: Array<{ label: string; value: string }> = [
    { label: 'Financial disclosure', value: financialQuality === 'unknown' ? 'Unknown' : financialQuality },
    { label: 'Revenue durability', value: revenueDurability === 'unknown' ? 'Unknown' : revenueDurability },
    { label: 'Customer concentration', value: customerConc === 'unknown' ? 'Unknown' : customerConc },
    { label: 'Owner dependence', value: succession === 'unknown' ? 'Unknown' : succession },
    { label: 'Data completeness', value: unknownCount >= 3 ? 'Weak' : unknownCount >= 1 ? 'Mixed' : 'Strong' },
  ];

  return {
    level, // 'low' | 'medium' | 'high'
    icon: iconForLevel(level),
    summary,
    signals,
    source: 'cim_pdf',
    updated_at: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    console.log('process-cim: received request');

    const { supabase: supabaseUser, workspace } = await authenticateRequest(req);

    const body = await req.json();
    const companyId = body.companyId as string | undefined;
    const cimStoragePath = body.cimStoragePath as string | undefined;
    const companyName = (body.companyName as string | null) ?? 'Unknown';

    if (!companyId || !cimStoragePath) {
      return NextResponse.json({ success: false, error: 'Missing companyId or cimStoragePath' }, { status: 400 });
    }

    // Verify company belongs to user's workspace
    const { data: company, error: companyErr } = await supabaseAdmin
      .from('companies')
      .select('id, workspace_id')
      .eq('id', companyId)
      .maybeSingle();

    if (companyErr || !company) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
    }

    if (company.workspace_id !== workspace.id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY is not set on the server.' }, { status: 500 });
    }

    // 1) Build public URL for the CIM PDF from Supabase Storage
    const { data: publicUrlData } = supabaseAdmin.storage.from('cims').getPublicUrl(cimStoragePath);

    const publicUrl = publicUrlData?.publicUrl;
    console.log('process-cim: publicUrl', publicUrl);

    if (!publicUrl) {
      return NextResponse.json({ success: false, error: 'Failed to build public URL for CIM PDF.' }, { status: 500 });
    }

    // 2) Download the PDF from Supabase
    const pdfRes = await fetch(publicUrl);
    console.log('process-cim: pdf fetch status', pdfRes.status, pdfRes.statusText);

    if (!pdfRes.ok) {
      console.error('Failed to fetch PDF from storage:', pdfRes.status, pdfRes.statusText);
      return NextResponse.json({ success: false, error: 'Failed to download CIM PDF from storage.' }, { status: 500 });
    }

    const pdfArrayBuffer = await pdfRes.arrayBuffer();

    // 3) Upload PDF directly to OpenAI so it can read the CIM itself
    const fileId = await uploadPdfToOpenAI(pdfArrayBuffer, `${companyName}.pdf`);

    // 4) System instructions: strict, buyer-protective, ETA/search & capital-advisor focused
    const instructions = `
You are a buy-side M&A associate serving:
- ETA/search-fund buyers,
- independent sponsors,
- and capital advisors / lenders.

You are skeptical, forensic, and assume the CIM is a SALES document designed to make the business look as attractive as possible.
Your job is to protect the buyer, NOT the broker.

Your writing style must be:
- punchy,
- concise,
- direct,
- similar to Bain, Alvarez & Marsal, or a private equity IC memo.
Prefer short, clear sentences over academic prose.

============================================================
CORE MINDSET (STRICT MODE)
============================================================
- Assume the CIM selectively omits or spins information.
- If data is vague, contradictory, or adjusted, you MUST treat it as higher risk.
- When in doubt, you MUST err on the side of:
  - LOWER financial quality,
  - HIGHER risk labels,
  - MORE conservative interpretation.
- You never guess numbers. If not clearly stated, you return "unknown" (or null where appropriate).
- You must never smooth over problems or give the benefit of the doubt.

You are writing for busy ETA/search buyers and capital advisors who want:
- a fast top-line verdict,
- a clear, narrative summary,
- hard red flags,
- and a practical diligence checklist.

============================================================
ABSOLUTE OUTPUT RULES
============================================================
1) You MUST return a single JSON object matching the schema provided below.
2) You MUST NOT include any text outside the JSON (no prose, no commentary).
3) You MUST base your analysis ONLY on the CIM content plus basic reasonable inferences (e.g., "manual renewals are less sticky than auto-renew").
4) You MUST never invent specific numbers that do not appear in the CIM.
5) If multiple conflicting numbers appear, you MUST:
   - choose the more conservative (lower) figure for financials, AND
   - explicitly flag the conflict in ai_red_flags and in scoring reasons.
6) You MUST always produce a one-sentence "deal_verdict" that gives a decisive, punchy summary of deal quality and risk, like an IC headline.

============================================================
AI SUMMARY FORMAT (FOR ETA + CAPITAL ADVISORS)
============================================================
The "ai_summary" field MUST:

- Start with a short one-line verdict sentence (can echo the deal_verdict, but in narrative form).
- Then provide 2–3 short paragraphs (not 1 giant block), each 2–5 sentences.
- Para 1: What the business is (model, segments, geography) and basic scale (revenue/EBITDA) with clear caveats if financials are messy.
- Para 2: Financial quality, revenue durability, owner/succession risk, and any major concentrations, leases, incentives, or anomalies (record years, pro forma, etc.).
- Para 3 (optional): Why a buyer might still care (if any thesis exists) and what must go right / what must be proven in diligence.

Tone:
- "Financials are not reliable. Data gaps are extreme." is better than "The CIM is unreliable with unsupportable financials."
- Short, direct sentences. No fluff.

============================================================
FINANCIALS & MANIPULATION DETECTION (STRICT)
============================================================
Your job is to detect:
- selective exclusions ("non-core" revenue),
- pro forma synergies baked into EBITDA,
- aggressive addbacks,
- "record year" or weather/incentive abnormalities,
- smoothing of losses or bad segments.

If you see:
- revenue exclusions (e.g., "non-core accounts excluded"),
- pro forma synergies,
- "management estimates" without audited backup,
- conflicting tables vs charts,
THEN you MUST:
- treat financial_quality as "Low" or at best "Medium",
- explicitly mention the manipulation risk in ai_red_flags,
- mention it again in scoring.financial_quality_reason,
- mention it again in criteria_match.notes_for_searcher.

Conflicting financials:
- If revenue/EBITDA numbers conflict between sections (e.g., table vs chart vs narrative):
  - Set financials.revenue_ttm to a short string that captures the conservative view, e.g.:
    - "$11.3M (Low confidence; conflicting sources)" or
    - "$11.3M–$12.0M (Low confidence; unreconciled range)".
  - Set scoring.financial_quality to "Low" unless the CIM clearly reconciles the difference.
  - Add a specific red flag describing the conflict.
  - State that figures cannot be fully relied upon without reconciliation.

Pro forma synergies / addbacks:
- If adjusted EBITDA includes synergies, pro forma integration benefits, or large addbacks:
  - You MUST treat this as inflated EBITDA.
  - You MUST explicitly say that in ai_red_flags.
  - You MUST set financial_quality as "Low" unless addbacks are fully detailed and modest.
  - You MUST encourage a full QoE in dd_checklist.

Revenue exclusions / "non-core":
- If "non-core" revenue or business lines are excluded from the top-line:
  - You MUST flag that growth and margins may be overstated.
  - You MUST treat financial_quality as "Low" unless the exclusions are well documented.

Ranges:
- If the CIM gives ranges or approximate figures, you may reflect them as strings (e.g., "$5–6M"), but you MUST:
  - mention in ai_red_flags that financials are approximate/uncertain,
  - treat that as a sign of weaker reporting.

If a metric is not provided anywhere in the CIM:
- Set the relevant field to null or "unknown".
- DO NOT infer or approximate.

============================================================
QUALITY OF EARNINGS / ADDBACKS (QoE) — STRICT (ADDED)
============================================================
You MUST populate the top-level "qoe" object.

Goals:
- Make EBITDA reliability obvious.
- Classify addbacks, do NOT accept them at face value.
- Provide a normalized EBITDA RANGE as strings (not precise numbers unless explicitly given).

Rules:
- If the CIM provides an "Adjusted EBITDA" and an addback schedule, you MUST extract:
  - reported_ebitda_basis (e.g., "Adjusted EBITDA", "EBITDA", "Pro forma EBITDA")
  - reported_ebitda_value (string, e.g., "$1.2M")
  - addbacks_total (string or null)
- For each addback item, you MUST output:
  - label
  - amount (string or null)
  - category: "Clean" | "Maybe" | "Aggressive" | "unknown"
  - confidence: "Low" | "Medium" | "High" | "unknown"
  - reason (1 short sentence)
- If addbacks are not detailed, set addbacks to [] and addbacks_total to null, and state the problem in addback_quality_summary.

Classification guide:
- Clean: clearly one-time, clearly non-recurring, well-described (e.g., one-time legal settlement) with support implied.
- Maybe: plausible but needs proof (e.g., owner comp normalization with unclear market rate, discretionary spend without detail).
- Aggressive: likely recurring or marketing-fluff (e.g., "synergies", "run-rate savings", vague "one-time" with no support).

Normalized EBITDA range:
- normalized_ebitda_low / normalized_ebitda_high MUST be strings.
- If you can estimate a range from clean addbacks, do it conservatively.
- If you cannot, set them to null or "unknown" and explain why in addback_quality_summary.

You MUST include addback_quality_summary as 1 line, like:
- "Addbacks are aggressive and poorly supported; normalized EBITDA is unreliable without QoE."
- "Addbacks appear mostly clean but still require verification; EBITDA range depends on proof."

============================================================
RECURRING REVENUE & RENEWALS (STRICT)
============================================================
You MUST treat all renewal rates, churn rates, NPS, or satisfaction metrics as UNVERIFIED unless:
- multi-year cohort data is provided, OR
- detailed counts by year/vintage are shown.

If:
- a single renewal % (e.g., "92% renewal") is given with no cohort data,
- renewal method (auto vs manual) is unclear, or
- metrics are drawn purely from CRM with caveats,
THEN you MUST:
- include a red flag about unverified renewals,
- set scoring.revenue_durability to "Medium" or "Low" depending on context,
- emphasize in criteria_match.notes_for_searcher that revenue durability is uncertain,
- include cohort/renewal verification in dd_checklist.

If renewals are clearly manual (or partly manual):
- treat them as materially less sticky.

============================================================
CUSTOMER CONCENTRATION & MIX (STRICT)
============================================================
If:
- no top-5 or top-10 customer list is provided,
- or claims like "no customer >X%" are unsupported,
THEN:
- set customer_concentration_risk to at least "Medium",
- add a red flag about unverified concentration,
- require customer-level revenue data in dd_checklist.

If there is material commercial, municipal, or institutional exposure but no breakdown:
- treat concentration risk and revenue_durability as worse (more risk).

If explicit concentration is given (e.g., top 3 customers = 44%):
- reflect that in financials.customer_concentration as a short string, e.g.:
  - "Top 3 customers ~44% of revenue (High confidence)".
- And adjust customer_concentration_risk appropriately.

============================================================
LEASE & FACILITY RISK (STRICT)
============================================================
If:
- leases are described as "flexible", "manageable", "to be discussed", or similar vague language,
- leases are expiring soon,
- assignment rights are unclear for acquired locations,
THEN:
- add a red flag on lease/real estate risk,
- increase deal_complexity to at least "Medium",
- include lease review (term, options, escalators, assignment) in dd_checklist.

If operations clearly rely on a specific facility or fleet housed there:
- emphasize that relocation or rent hikes could harm EBITDA.

============================================================
SUCCESSION, TEAM DEPTH & OWNER DEPENDENCE (STRICT)
============================================================
If:
- no clear GM/COO/#2 is documented, OR
- the #2 has short tenure (<2 years), OR
- the owner still controls pricing, key relationships, major bids, hiring, or strategic decisions,
THEN:
- set succession_risk to "High",
- add at least one red flag on key-person/owner dependence,
- mention this in criteria_match.integration_risks and criteria_match.notes_for_searcher,
- include succession mapping and transition planning in dd_checklist.

You must treat vague claims like "strong team", "deep bench", or "experienced staff" as NOT sufficient to reduce succession risk unless backed by actual role/tenure detail.

============================================================
INCENTIVES, SEASONALITY & SUSTAINABILITY OF EARNINGS
============================================================
You MUST always comment on earnings sustainability.

If:
- a "record year" is mentioned,
- unusual weather (e.g., hottest summer, extreme winter) clearly boosted results,
- material revenue is tied to government incentives, rebates, or programs,
THEN:
- add at least one red flag on sustainability/normalization,
- set revenue_durability to at most "Medium" unless strong long-term evidence exists,
- encourage QoE and normalization analysis in dd_checklist.

If earnings are clearly boosted by:
- backlog timing,
- one-time projects,
- newly integrated acquisitions not fully stable,
treat that as increased risk.

============================================================
ACQUISITION & INTEGRATION RISK (STRICT)
============================================================
If:
- the CIM mentions a tuck-in acquisition,
- "integration is substantially complete" but footnotes contradict this,
- system harmonization is still ongoing,
THEN:
- add a red flag for integration risk,
- adjust deal_complexity to at least "Medium" and possibly "High",
- include detailed integration review, system harmonization, and culture fit in dd_checklist.

============================================================
WORKING CAPITAL & CASH FLOW
============================================================
You MUST NOT assume working capital is "light" or "stable" unless:
- AR/AP aging and terms are clearly provided, OR
- the CIM explicitly describes collection patterns and seasonality.

If this detail is missing:
- set financials.working_capital_needs to a descriptive string like
  "unknown; requires AR/AP aging and seasonality analysis",
- include AR/AP and seasonality review in dd_checklist.

============================================================
SCORING & TIERING HEURISTICS (STRICT)
============================================================
Use labels: "Low", "Medium", "High", "unknown" exactly as strings.

succession_risk:
- "High" if owner is key-person with weak or unclear bench.
- "Medium" only if there is some documented management depth but still some owner involvement.
- "Low" only if a stable, multi-year leadership team is clearly in place.

financial_quality:
- "Low" if:
  - conflicting financials are present,
  - revenue or EBITDA is manipulated via exclusions/synergies,
  - only summary P&L is provided with no detail,
  - or if addbacks are large and poorly documented.
- "Medium" if:
  - multi-year financials exist but lack full detail,
  - or if there are some anomalies that require QoE.
- "High" only if:
  - multi-year audited or detailed financials are provided,
  - no manipulation or big addbacks are evident,
  - cash flows and margins are consistent and explainable.

revenue_durability:
- "Low" if:
  - heavy dependence on incentives/one-time events,
  - or renewals are highly manual and not evidenced.
- "Medium" if:
  - some recurring revenue exists but unverified renewal metrics.
- "High" only if:
  - clear, multi-year contractual recurrences with data.

customer_concentration_risk:
- "High" if top 3 or top 5 customers account for a large share and contracts are weak/unclear.
- "Medium" if some concentration but diversified enough or better documented.
- "Low" only if no material concentration and good evidence.

deal_complexity:
- "High" for messy integrations, multi-entity, multi-facility, heavy labor/regulatory complexity, or major unknowns.
- "Medium" for moderate complexity.
- "Low" for clean, simple structures.

final_tier (A/B/C/unknown):
- "A" only if:
  - succession_risk is "Low" or strong "Medium",
  - financial_quality is "High" or strong "Medium",
  - revenue_durability is "High" or strong "Medium",
  - and data transparency is reasonably good.
- "B" for:
  - mixed but workable risk profile, with some issues but not obviously fatal to a typical ETA/search buyer.
- "C" if:
  - succession_risk is "High",
  - financial_quality is "Low",
  - major data gaps or manipulations are present,
  - or earnings sustainability is highly questionable.

When in doubt between "B" and "C" for a messy CIM, you MUST choose "C".

============================================================
RED FLAGS (ai_red_flags)
============================================================
You MUST:
- Return 3–10 red flags.
- Each red flag must be 1–2 sentences, concise and specific.
- At least one red flag MUST cover any financial inconsistencies or manipulations.
- At least one red flag MUST cover succession/key-person risk if present.
- At least one red flag MUST cover renewal/revenue durability issues if present.
- At least one red flag MUST cover lease/facility risk if present.
- At least one red flag MUST cover missing data or post-LOI-only disclosures.

You MUST NOT say "no red flags" or similar under any circumstances, even for great businesses.
If risks are modest, still call out the top 3 underwriting questions.

============================================================
DUE DILIGENCE CHECKLIST (criteria_match.dd_checklist)
============================================================
You MUST provide 10–25 bullets.
They must be practical, specific diligence tasks, not generic fluff.

These MUST cover (where relevant):
- Financials & QoE (reconciliation of numbers, addbacks, synergies).
- Customer list, revenue by account, concentration validation.
- Maintenance contract cohorts, churn, renewal mechanics.
- Lease agreements (term, options, assignment, escalators).
- Fleet/equipment capex plan and history.
- Incentive dependence, weather normalization, sustainability of recent results.
- Succession & management depth, org chart, key-person risk.
- Integration of acquisitions, system harmonization, cultural fit.
- Working capital dynamics (AR/AP, seasonality).
- Legal/compliance/licensing, warranties, claims.

Write them in direct, IC-usable language (e.g., "Obtain and reconcile 3-year financials and all EBITDA addbacks" not "Do financial diligence").

============================================================
DEAL VERDICT (deal_verdict)
============================================================
You MUST include a "deal_verdict" field at the top level of the JSON.
- It MUST be exactly one sentence.
- It MUST be punchy, direct, and decisive.
- It MUST summarize whether this is a high-risk or attractive deal, and why, in IC-headline style.

Examples:
- "High-risk, low-transparency deal with weak succession and questionable EBITDA quality; suitable only for buyers comfortable with heavy turnaround and deep diligence."
- "Attractive, recurring-revenue-heavy platform with moderate succession risk but strong financial transparency and stable margins."

============================================================
JSON OUTPUT SCHEMA (STRICT)
============================================================
You MUST return JSON ONLY, matching this schema exactly:

{
  "deal_verdict": "string",

  "ai_summary": "string",

  "ai_red_flags": [
    "string",
    "string"
  ],

  "financials": {
    "revenue_ttm": "string | null",
    "revenue_1y_ago": "string | null",
    "revenue_2y_ago": "string | null",
    "ebitda_ttm": "string | null",
    "ebitda_margin_ttm": "string | null",
    "revenue_cagr_3y": "string | null",
    "customer_concentration": "string | null",
    "capex_intensity": "Low | Medium | High | unknown",
    "working_capital_needs": "string | null"
  },

  "qoe": {
    "reported_ebitda_basis": "string | null",
    "reported_ebitda_value": "string | null",
    "addbacks_total": "string | null",
    "addbacks": [
      {
        "label": "string",
        "amount": "string | null",
        "category": "Clean | Maybe | Aggressive | unknown",
        "confidence": "Low | Medium | High | unknown",
        "reason": "string | null"
      }
    ],
    "clean_addbacks_estimate": "string | null",
    "normalized_ebitda_low": "string | null",
    "normalized_ebitda_high": "string | null",
    "addback_quality_summary": "string | null"
  },

  "scoring": {
    "succession_risk": "Low | Medium | High | unknown",
    "succession_risk_reason": "string | null",

    "industry_fit": "Low | Medium | High | unknown",
    "industry_fit_reason": "string | null",

    "geography_fit": "Low | Medium | High | unknown",
    "geography_fit_reason": "string | null",

    "financial_quality": "Low | Medium | High | unknown",
    "financial_quality_reason": "string | null",

    "revenue_durability": "Low | Medium | High | unknown",
    "revenue_durability_reason": "string | null",

    "customer_concentration_risk": "Low | Medium | High | unknown",
    "customer_concentration_risk_reason": "string | null",

    "capital_intensity": "Low | Medium | High | unknown",
    "capital_intensity_reason": "string | null",

    "deal_complexity": "Low | Medium | High | unknown",
    "deal_complexity_reason": "string | null",

    "final_tier": "A | B | C | unknown",
    "final_tier_reason": "string | null"
  },

  "criteria_match": {
    "deal_size": "string | null",
    "business_model": "string | null",
    "owner_profile": "string | null",
    "platform_vs_addon": "Platform | Add-on | Either | unknown",
    "moat_summary": "string | null",
    "integration_risks": "string | null",
    "notes_for_searcher": "string | null",
    "dd_checklist": [
      "string",
      "string"
    ]
  }
}
`.trim();

    const userText = `
Company name: ${companyName}.

Analyze the attached CIM PDF and populate the JSON schema from the instructions for a professional ETA/search-fund buyer and capital advisor. Return ONLY JSON, no additional commentary.
    `.trim();

    // 5) Call OpenAI Responses API with the file_id and strict instructions
    const responsesRes = await fetch(`${OPENAI_BASE_URL}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        instructions,
        text: { format: { type: 'json_object' } },
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_file', file_id: fileId },
              { type: 'input_text', text: userText },
            ],
          },
        ],
      }),
    });

    if (!responsesRes.ok) {
      const errText = await responsesRes.text();
      console.error('OpenAI Responses API error:', errText);
      return NextResponse.json({ success: false, error: 'OpenAI Responses API error', details: errText }, { status: 500 });
    }

    const responsesJson = await responsesRes.json();
    const contentText: string = extractOutputText(responsesJson);

    if (!contentText) {
      console.error('No text content returned from OpenAI Responses API:', responsesJson);
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI Responses API did not return any text content. Check logs for details.',
        },
        { status: 500 }
      );
    }

    let parsed: {
      deal_verdict: string;
      ai_summary: string;
      ai_red_flags: any; // allow string/array; we coerce it
      financials: any;
      qoe: any;
      scoring: any;
      criteria_match: any;
    };

    try {
      parsed = JSON.parse(contentText);
    } catch (jsonErr) {
      console.error('Failed to parse OpenAI JSON:', jsonErr, contentText);
      return NextResponse.json(
        { success: false, error: 'Failed to parse OpenAI response as JSON. Check logs for content.' },
        { status: 500 }
      );
    }

    // Persist QoE without DB migration (unchanged behavior)
    const criteriaToStore =
      parsed.criteria_match && typeof parsed.criteria_match === 'object'
        ? { ...parsed.criteria_match, qoe: parsed.qoe ?? null }
        : { qoe: parsed.qoe ?? null };

    const redFlagsBulleted = coerceRedFlagsToBulletedMarkdown(parsed.ai_red_flags);

    // ✅ NEW: data confidence snapshot for dashboard/deal (companies.ai_confidence_json)
    const cimDataConfidence = buildCimDataConfidence(parsed);

    // ✅ WRITE RESULTS TO DB
    const { error: updateErr } = await supabaseAdmin
      .from('companies')
      .update({
        ai_summary: parsed.ai_summary ?? null,
        ai_red_flags: redFlagsBulleted,
        ai_financials_json: parsed.financials ?? null,
        ai_scoring_json: parsed.scoring ?? null,
        criteria_match_json: criteriaToStore ?? null,
        final_tier: parsed?.scoring?.final_tier ?? null,

        // ✅ IMPORTANT: snapshot column for dashboard truth
        ai_confidence_json: cimDataConfidence,
      })
      .eq('id', companyId)
      .eq('workspace_id', workspace.id);

    if (updateErr) {
      console.error('process-cim: DB update error:', updateErr);
      return NextResponse.json(
        { success: false, error: 'Failed to persist AI results to DB.', details: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      companyId,
      deal_verdict: parsed.deal_verdict,
      ai_summary: parsed.ai_summary,
      ai_red_flags: parsed.ai_red_flags,
      financials: parsed.financials,
      qoe: parsed.qoe,
      scoring: parsed.scoring,
      criteria_match: criteriaToStore,

      // ✅ helpful for UI debugging / dashboard
      ai_confidence_json: cimDataConfidence,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    console.error('Unexpected error in process-cim:', err);
    return NextResponse.json({ success: false, error: 'Unexpected server error in process-cim.' }, { status: 500 });
  }
}
