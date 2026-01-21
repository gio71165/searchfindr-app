// app/api/process-cim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { NotFoundError } from '@/lib/data-access/base';
import { CIM_ANALYSIS_INSTRUCTIONS, buildCimAnalysisUserText } from '@/lib/prompts/cim-analysis';
import { checkRateLimit, getRateLimitConfig } from '@/lib/api/rate-limit';
import { validateFileSize, validateFileType } from '@/lib/api/file-validation';
import { validateStoragePath } from '@/lib/api/security';
import { sanitizeShortText } from '@/lib/utils/sanitize';
import { logger } from '@/lib/utils/logger';
import { withRetry } from '@/lib/utils/retry';
import type { CriteriaMatch, ConfidenceJson } from '@/lib/types/deal';

export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!OPENAI_API_KEY) {
  logger.warn('OPENAI_API_KEY is not set. /api/process-cim will fail until you set it in .env.local');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  logger.warn('Supabase server env vars missing. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}

// ✅ Server-side Supabase client (bypasses RLS). Never use this on the client.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Helper: upload file bytes to OpenAI Files API and return file_id
async function uploadFileToOpenAI(fileArrayBuffer: ArrayBuffer, filename: string, mimeType: string) {
  const fileBlob = new Blob([fileArrayBuffer], { type: mimeType });

  const formData = new FormData();
  formData.append('file', fileBlob, filename);
  formData.append('purpose', 'assistants');

  const res = await withRetry(
    () =>
      fetch(`${OPENAI_BASE_URL}/v1/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      }),
    { maxRetries: 2, delayMs: 1000 }
  );

  if (!res.ok) {
    const errorText = await res.text();
    logger.error('OpenAI file upload error:', errorText);
    throw new Error(`Failed to upload CIM file to OpenAI: ${errorText}`);
  }

  const json = await res.json();
  logger.info('process-cim: uploaded file id', json.id, 'for file', filename);
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
type DataConfidenceLevel = 'A' | 'B' | 'C';

function iconForLevel(level: DataConfidenceLevel): '⚠️' | '◑' | '●' {
  if (level === 'A') return '●';
  if (level === 'B') return '◑';
  return '⚠️';
}

function safeStr(v: unknown): string {
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

function countUnknownScoringFields(scoring: {
  succession_risk?: unknown;
  industry_fit?: unknown;
  geography_fit?: unknown;
  financial_quality?: unknown;
  revenue_durability?: unknown;
  customer_concentration_risk?: unknown;
  capital_intensity?: unknown;
  deal_complexity?: unknown;
}): number {
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

function buildCimDataConfidence(parsed: {
  scoring?: {
    financial_quality?: unknown;
    revenue_durability?: unknown;
    customer_concentration_risk?: unknown;
    succession_risk?: unknown;
    industry_fit?: unknown;
    geography_fit?: unknown;
    capital_intensity?: unknown;
    deal_complexity?: unknown;
  };
  ai_red_flags?: unknown;
}): ConfidenceJson {
  const scoring = parsed?.scoring ?? {};

  const financialQuality = normalizeLMH(scoring?.financial_quality);
  const revenueDurability = normalizeLMH(scoring?.revenue_durability);
  const customerConc = normalizeLMH(scoring?.customer_concentration_risk);
  const succession = normalizeLMH(scoring?.succession_risk);

  const unknownCount = countUnknownScoringFields(scoring);
  const redFlagsCount = countRedFlags(parsed);

  // Conservative decision logic:
  // - C if financial quality is Low OR lots of unknowns
  // - A only if financial quality is High AND very few unknowns AND modest red flags
  let level: DataConfidenceLevel = 'B';
  if (financialQuality === 'Low' || unknownCount >= 3) level = 'C';
  if (financialQuality === 'High' && unknownCount <= 1 && redFlagsCount <= 4) level = 'A';

  // One-line reason (data confidence wording)
  let summaryReason = 'inputs require verification';
  if (financialQuality === 'Low') summaryReason = 'financial disclosures appear inconsistent or heavily adjusted';
  else if (unknownCount >= 3) summaryReason = 'material disclosures are missing or unclear';
  else if (level === 'A') summaryReason = 'disclosures appear internally consistent with reasonable detail';

  const summary =
    level === 'A'
      ? `A tier data confidence — ${summaryReason}.`
      : level === 'B'
      ? `B tier data confidence — ${summaryReason}.`
      : `C tier data confidence — ${summaryReason}.`;

  const signals: Array<{ label: string; value: string }> = [
    { label: 'Financial disclosure', value: financialQuality === 'unknown' ? 'Unknown' : financialQuality },
    { label: 'Revenue durability', value: revenueDurability === 'unknown' ? 'Unknown' : revenueDurability },
    { label: 'Customer concentration', value: customerConc === 'unknown' ? 'Unknown' : customerConc },
    { label: 'Owner dependence', value: succession === 'unknown' ? 'Unknown' : succession },
    { label: 'Data completeness', value: unknownCount >= 3 ? 'Weak' : unknownCount >= 1 ? 'Mixed' : 'Strong' },
  ];

  return {
    level, // 'A' | 'B' | 'C'
    icon: iconForLevel(level),
    summary,
    signals,
    source: 'cim_pdf',
    updated_at: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let statusCode = 500;
  let errorMessage: string | undefined;
  
  try {
    logger.info('process-cim: received request');

    const { supabase: supabaseUser, user, workspace } = await authenticateRequest(req);
    
    // Rate limiting
    const config = getRateLimitConfig('process-cim');
    const rateLimit = await checkRateLimit(user.id, 'process-cim', config.limit, config.windowSeconds, supabaseUser);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: `Rate limit exceeded. Maximum ${config.limit} requests per hour. Please try again later.` },
        { status: 429 }
      );
    }

    const deals = new DealsRepository(supabaseUser, workspace.id);

    const body = await req.json();
    const companyId = body.companyId as string | undefined;
    const cimStoragePath = body.cimStoragePath as string | undefined;
    const companyName = sanitizeShortText((body.companyName as string | null) ?? 'Unknown');

    if (!companyId || !cimStoragePath) {
      return NextResponse.json({ success: false, error: 'Missing companyId or cimStoragePath' }, { status: 400 });
    }

    // Validate storage path to prevent path traversal attacks
    if (!validateStoragePath(cimStoragePath)) {
      logger.warn('process-cim: Invalid storage path attempted', { cimStoragePath, userId: user.id });
      return NextResponse.json({ success: false, error: 'Invalid storage path' }, { status: 400 });
    }

    // Verify company belongs to user's workspace
    try {
      await deals.getById(companyId);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
      }
      throw err;
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY is not set on the server.' }, { status: 500 });
    }

    // 1) Build public URL for the CIM file from Supabase Storage
    const { data: publicUrlData } = supabaseAdmin.storage.from('cims').getPublicUrl(cimStoragePath);

    const publicUrl = publicUrlData?.publicUrl;
    logger.info('process-cim: publicUrl', publicUrl);

    if (!publicUrl) {
      return NextResponse.json({ success: false, error: 'Failed to build public URL for CIM file.' }, { status: 500 });
    }

    // 2) Download the file from Supabase
    const fileRes = await fetch(publicUrl);
    logger.info('process-cim: file fetch status', fileRes.status, fileRes.statusText);

    if (!fileRes.ok) {
      logger.error('Failed to fetch file from storage:', fileRes.status, fileRes.statusText);
      return NextResponse.json({ success: false, error: 'Failed to download CIM file from storage.' }, { status: 500 });
    }

    const fileArrayBuffer = await fileRes.arrayBuffer();

    // Validate file size
    const sizeCheck = validateFileSize(fileArrayBuffer.byteLength);
    if (!sizeCheck.valid) {
      return NextResponse.json({ success: false, error: sizeCheck.error }, { status: 400 });
    }

    // Get file extension from storage path to help with type detection
    const pathExtension = cimStoragePath.split('.').pop()?.toLowerCase() || '';
    
    // Validate file type by magic bytes - support PDF, DOCX, and DOC
    const typeCheck = validateFileType(fileArrayBuffer, ['pdf', 'docx', 'doc', 'xlsx', 'xls']); // Include xlsx/xls for detection
    
    if (!typeCheck.valid) {
      return NextResponse.json({ success: false, error: typeCheck.error || 'Invalid file type. Only PDF, DOCX, and DOC files are supported.' }, { status: 400 });
    }

    // Determine actual file type - use extension as hint for ZIP/OLE2 files
    let detectedType = typeCheck.detectedType || 'pdf';
    
    // If detected as ZIP (could be DOCX or XLSX), use extension to determine
    if (detectedType === 'xlsx' || detectedType === 'docx') {
      if (pathExtension === 'docx') {
        detectedType = 'docx';
      } else if (pathExtension === 'xlsx' || pathExtension === 'xls') {
        return NextResponse.json({ success: false, error: 'Excel files are not supported for CIM processing. Please upload a PDF, DOCX, or DOC file.' }, { status: 400 });
      } else {
        // Default to DOCX if extension not clear (for CIM context)
        detectedType = 'docx';
      }
    }
    
    // If detected as OLE2 (could be DOC or XLS), use extension to determine
    if (detectedType === 'xls' || detectedType === 'doc') {
      if (pathExtension === 'doc') {
        detectedType = 'doc';
      } else if (pathExtension === 'xlsx' || pathExtension === 'xls') {
        return NextResponse.json({ success: false, error: 'Excel files are not supported for CIM processing. Please upload a PDF, DOCX, or DOC file.' }, { status: 400 });
      } else {
        // Default to DOC if extension not clear (for CIM context)
        detectedType = 'doc';
      }
    }
    
    // Final validation - ensure it's one of the allowed CIM types
    if (!['pdf', 'docx', 'doc'].includes(detectedType)) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Only PDF, DOCX, and DOC files are supported for CIM processing.' }, { status: 400 });
    }
    
    // Determine MIME type and file extension based on detected type
    let mimeType: string;
    let fileExtension: string;
    switch (detectedType) {
      case 'docx':
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileExtension = 'docx';
        break;
      case 'doc':
        mimeType = 'application/msword';
        fileExtension = 'doc';
        break;
      case 'pdf':
      default:
        mimeType = 'application/pdf';
        fileExtension = 'pdf';
        break;
    }

    // 3) Upload file directly to OpenAI so it can read the CIM itself
    const fileId = await uploadFileToOpenAI(fileArrayBuffer, `${companyName}.${fileExtension}`, mimeType);

    // 4) System instructions: strict, buyer-protective, ETA/search & capital-advisor focused
    const instructions = CIM_ANALYSIS_INSTRUCTIONS.template;

    const userText = buildCimAnalysisUserText(companyName);

    // 5) Call OpenAI Responses API with the file_id and strict instructions (with retry)
    const responsesRes = await withRetry(
      () =>
        fetch(`${OPENAI_BASE_URL}/v1/responses`, {
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
        }),
      { maxRetries: 2, delayMs: 1000 }
    );

    if (!responsesRes.ok) {
      const errText = await responsesRes.text();
      logger.error('OpenAI Responses API error:', errText);
      return NextResponse.json({ success: false, error: 'Unable to process CIM document. Please try again later.' }, { status: 500 });
    }

    const responsesJson = await responsesRes.json();
    const contentText: string = extractOutputText(responsesJson);

    if (!contentText) {
      logger.error('No text content returned from OpenAI Responses API:', responsesJson);
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI Responses API did not return any text content. Check logs for details.',
        },
        { status: 500 }
      );
    }

    let parsed: {
      deal_verdict?: string;
      ai_summary?: string;
      ai_red_flags?: string | string[] | null;
      financials?: Record<string, unknown>;
      qoe?: Record<string, unknown>;
      scoring?: Record<string, unknown>;
      criteria_match?: Record<string, unknown>;
      decision_framework?: {
        verdict?: string;
        primary_reason?: string;
        verdict_confidence?: string;
        recommended_next_action?: string;
      };
      deal_economics?: {
        asking_price?: string;
        revenue_ttm?: string;
        ebitda_ttm?: string;
        sba_eligible?: {
          assessment?: string;
        };
        deal_size_band?: string;
      };
    };

    try {
      parsed = JSON.parse(contentText);
    } catch (jsonErr) {
      logger.error('Failed to parse OpenAI JSON:', jsonErr, contentText);
      return NextResponse.json(
        { success: false, error: 'Failed to parse OpenAI response as JSON. Check logs for content.' },
        { status: 500 }
      );
    }

    // Persist QoE without DB migration (unchanged behavior)
    const criteriaToStore: CriteriaMatch & { qoe?: Record<string, unknown> | null } =
      parsed.criteria_match && typeof parsed.criteria_match === 'object'
        ? { ...parsed.criteria_match as CriteriaMatch, qoe: parsed.qoe ?? null }
        : { qoe: parsed.qoe ?? null } as CriteriaMatch & { qoe?: Record<string, unknown> | null };

    const redFlagsBulleted = coerceRedFlagsToBulletedMarkdown(parsed.ai_red_flags);

    // ✅ NEW: data confidence snapshot for dashboard/deal (companies.ai_confidence_json)
    const cimDataConfidence = buildCimDataConfidence(parsed);

    // ✅ Extract fields from analysis
    const verdict = parsed.decision_framework?.verdict?.toLowerCase() || null;
    const verdictReason = parsed.decision_framework?.primary_reason || null;
    const verdictConfidence = parsed.decision_framework?.verdict_confidence?.toLowerCase() || null;
    const nextAction = parsed.decision_framework?.recommended_next_action || null;
    const askingPrice = parsed.deal_economics?.asking_price || null;
    const revenueTTM = parsed.deal_economics?.revenue_ttm || null;
    const ebitdaTTM = parsed.deal_economics?.ebitda_ttm || null;
    const sbaEligible = parsed.deal_economics?.sba_eligible?.assessment === 'YES' ? true : 
                       parsed.deal_economics?.sba_eligible?.assessment === 'NO' ? false : null;
    const dealSizeBand = parsed.deal_economics?.deal_size_band || null;

    // ✅ WRITE RESULTS TO DB
    try {
      await deals.updateAnalysis(companyId, {
        ai_summary: parsed.ai_summary ?? null,
        ai_red_flags: redFlagsBulleted,
        ai_financials_json: parsed.financials ?? null,
        ai_scoring_json: parsed.scoring ?? null,
        criteria_match_json: criteriaToStore ?? null,
        final_tier: (parsed?.scoring?.final_tier === 'A' || parsed?.scoring?.final_tier === 'B' || parsed?.scoring?.final_tier === 'C') 
          ? parsed.scoring.final_tier 
          : null,
        ai_confidence_json: cimDataConfidence,
      });

      // Update analysis outputs (fields not in updateAnalysis method)
      const { error: updateError } = await supabaseUser
        .from('companies')
        .update({
          verdict: verdict === 'proceed' || verdict === 'park' || verdict === 'pass' ? verdict : null,
          verdict_reason: verdictReason,
          verdict_confidence: verdictConfidence === 'high' || verdictConfidence === 'medium' || verdictConfidence === 'low' ? verdictConfidence : null,
          next_action: nextAction,
          asking_price_extracted: askingPrice,
          revenue_ttm_extracted: revenueTTM,
          ebitda_ttm_extracted: ebitdaTTM,
          sba_eligible: sbaEligible,
          deal_size_band: dealSizeBand,
          stage: 'reviewing', // Auto-advance from 'new' to 'reviewing'
          last_action_at: new Date().toISOString(),
        })
        .eq('id', companyId)
        .eq('workspace_id', workspace.id);

      if (updateError) {
        logger.error('Failed to update deal analysis outputs:', updateError);
      }
    } catch (err) {
      logger.error('process-cim: DB update error:', err);
      return NextResponse.json(
        { success: false, error: 'CIM analysis completed but failed to save results. Please refresh and try again.' },
        { status: 500 }
      );
    }

    // Log activity
    try {
      const { error: activityError } = await supabaseUser
        .from('deal_activities')
        .insert({
          workspace_id: workspace.id,
          deal_id: companyId,
          user_id: user.id,
          activity_type: 'cim_analyzed',
          description: `AI analysis complete: ${verdict ? verdict.toUpperCase() : 'Unknown'} recommendation`,
          metadata: {
            verdict,
            verdict_confidence: verdictConfidence,
            analysis_type: 'cim'
          }
        });

      if (activityError) {
        console.error('Failed to log activity:', activityError);
      }
    } catch (activityErr) {
      console.error('Failed to log activity:', activityErr);
      // Don't fail the request, just log the error
    }

    statusCode = 200;
    const response = NextResponse.json({
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

    // Log usage
    const { logUsage, getIpAddress, getUserAgent } = await import('@/lib/api/usage-logger');
    await logUsage({
      userId: user.id,
      workspaceId: workspace.id,
      endpoint: 'process-cim',
      method: 'POST',
      statusCode,
      responseTimeMs: Date.now() - startTime,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    return response;
  } catch (err) {
    statusCode = err instanceof AuthError ? err.statusCode : 500;
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    if (err instanceof AuthError) {
      const response = NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
      
      // Log usage for auth errors
      try {
        const { logUsage, getIpAddress, getUserAgent } = await import('@/lib/api/usage-logger');
        await logUsage({
          endpoint: 'process-cim',
          method: 'POST',
          statusCode,
          errorMessage: err.message,
          responseTimeMs: Date.now() - startTime,
          ipAddress: getIpAddress(req),
          userAgent: getUserAgent(req),
        });
      } catch {}
      
      return response;
    }
    logger.error('process-cim error:', err);
    
    // Log usage for other errors
    try {
      const { logUsage, getIpAddress, getUserAgent } = await import('@/lib/api/usage-logger');
      await logUsage({
        endpoint: 'process-cim',
        method: 'POST',
        statusCode,
        errorMessage,
        responseTimeMs: Date.now() - startTime,
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req),
      });
    } catch {}
    
    return NextResponse.json({ success: false, error: 'Unable to process CIM document. Please try again later.' }, { status: 500 });
  }
}
