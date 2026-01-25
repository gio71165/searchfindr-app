// app/api/process-cim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { NotFoundError } from '@/lib/data-access/base';
import { CIM_ANALYSIS_INSTRUCTIONS, buildCimAnalysisUserText } from '@/lib/prompts/cim-analysis';
import { checkRateLimitOptimized, getRateLimitConfig } from '@/lib/api/rate-limiter';
import { validateFileSize, validateFileType } from '@/lib/api/file-validation';
import { validateStoragePath } from '@/lib/api/security';
import { sanitizeShortText } from '@/lib/utils/sanitize';
import { logger } from '@/lib/utils/logger';
import { withRetry } from '@/lib/utils/retry';
import type { CriteriaMatch, ConfidenceJson } from '@/lib/types/deal';
import { extractText, getDocumentProxy } from 'unpdf';
import { canAnalyzeCIM, incrementCIMUsage, getCurrentUsage } from '@/lib/usage/usage-tracker';

export const runtime = 'nodejs';

// Maximum characters to send to OpenAI (approximately 25K tokens)
// Prevents context window overflow for large PDFs
const MAX_CIM_TEXT_CHARS = 100000; // ~25K tokens for GPT-4 Turbo

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

// Helper: Extract text from PDF buffer (uses unpdf – serverless-friendly, no workers)
async function extractPDFText(buffer: Buffer): Promise<{ text: string; wasTruncated: boolean }> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const fullText = (text ?? '').trim();

    if (!fullText) {
      logger.error('PDF extraction returned empty text (may be image-based):', {
        totalPages,
      });
      throw new Error('PDF_PARSING_EMPTY_TEXT');
    }

    if (fullText.length > MAX_CIM_TEXT_CHARS) {
      const truncatedText =
        fullText.slice(0, MAX_CIM_TEXT_CHARS) +
        '\n\n[CIM content truncated due to length. Analysis based on first 100,000 characters.]';
      return { text: truncatedText, wasTruncated: true };
    }

    return { text: fullText, wasTruncated: false };
  } catch (error) {
    logger.error('PDF extraction failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('encrypted') || errorMessage.includes('password')) {
      throw new Error('PDF_PARSING_ENCRYPTED');
    }
    if (errorMessage.includes('corrupt') || errorMessage.includes('invalid')) {
      throw new Error('PDF_PARSING_CORRUPT');
    }
    if (errorMessage.includes('EMPTY_TEXT') || errorMessage.includes('no extractable text')) {
      throw new Error('PDF_PARSING_EMPTY_TEXT');
    }
    throw new Error('PDF_PARSING_FAILED');
  }
}

// Helper: Extract text from DOCX buffer
async function extractDOCXText(buffer: Buffer): Promise<{ text: string; wasTruncated: boolean }> {
  try {
    // Verify it's actually a DOCX file (ZIP signature)
    if (buffer.length < 4) {
      logger.error('DOCX extraction: Buffer too small', { bufferLength: buffer.length });
      throw new Error('DOCX_PARSING_FAILED: File too small to be a valid DOCX');
    }
    
    // Check for ZIP signature (DOCX is a ZIP file)
    const firstBytes = buffer.slice(0, 4);
    const isZip = firstBytes[0] === 0x50 && firstBytes[1] === 0x4B && 
                  (firstBytes[2] === 0x03 || firstBytes[2] === 0x05 || firstBytes[2] === 0x07) &&
                  (firstBytes[3] === 0x04 || firstBytes[3] === 0x06 || firstBytes[3] === 0x08);
    
    if (!isZip) {
      logger.error('DOCX extraction: File does not have ZIP signature', {
        firstBytes: Array.from(firstBytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '),
        bufferLength: buffer.length
      });
      throw new Error('DOCX_PARSING_FAILED: File does not appear to be a valid DOCX (missing ZIP signature)');
    }
    
    logger.info('DOCX extraction: Verified ZIP signature, buffer length', buffer.length);
    
    // Use require for CommonJS module (mammoth)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    let mammoth;
    try {
      mammoth = require('mammoth');
      logger.info('DOCX extraction: mammoth module loaded successfully');
    } catch (moduleError) {
      logger.error('Failed to load mammoth module:', moduleError);
      throw new Error('DOCX_PARSING_FAILED: mammoth module not available');
    }
    
    // Mammoth accepts Buffer directly - no need to convert to ArrayBuffer
    // The Buffer object works perfectly with mammoth
    logger.info('DOCX extraction: Using Buffer directly with mammoth', {
      bufferLength: buffer.length,
      bufferType: buffer.constructor.name
    });
    
    // Try to extract text - mammoth accepts { buffer: Buffer } or { path: string }
    logger.info('DOCX extraction: Calling mammoth.extractRawText with buffer...');
    const result = await mammoth.extractRawText({ buffer });
    logger.info('DOCX extraction: mammoth.extractRawText completed', {
      hasValue: !!result.value,
      valueType: typeof result.value,
      valueLength: result.value?.length || 0,
      messagesCount: result.messages?.length || 0
    });
    
    const fullText = result.value || '';
    
    // Check for mammoth warnings/messages that indicate issues
    if (result.messages && result.messages.length > 0) {
      logger.warn('DOCX extraction warnings:', result.messages);
      // Log each message for debugging
      result.messages.forEach((msg: any, idx: number) => {
        logger.warn(`DOCX extraction warning ${idx + 1}:`, msg);
      });
    }
    
    if (!fullText || typeof fullText !== 'string' || fullText.trim().length === 0) {
      logger.error('DOCX extraction returned empty or invalid text:', { 
        result: {
          hasValue: !!result.value,
          valueType: typeof result.value,
          valueLength: result.value?.length,
          valuePreview: typeof result.value === 'string' ? result.value.substring(0, 100) : 'N/A'
        },
        messages: result.messages,
        bufferLength: buffer.length
      });
      throw new Error('DOCX_PARSING_FAILED: No text extracted from DOCX file');
    }
    
    logger.info('DOCX extraction: Successfully extracted text', { textLength: fullText.length });
    
    if (fullText.length > MAX_CIM_TEXT_CHARS) {
      const truncatedText = fullText.slice(0, MAX_CIM_TEXT_CHARS) + 
        '\n\n[CIM content truncated due to length. Analysis based on first 100,000 characters.]';
      return { text: truncatedText, wasTruncated: true };
    }
    
    return { text: fullText, wasTruncated: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('DOCX extraction failed:', {
      errorMessage,
      errorStack,
      errorName: error instanceof Error ? error.name : 'Unknown',
      bufferLength: buffer?.length || 0,
      firstBytes: buffer && buffer.length >= 4 
        ? Array.from(buffer.slice(0, 4)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')
        : 'N/A'
    });
    
    // Check for specific error types from mammoth
    if (errorMessage.includes('corrupt') || errorMessage.includes('invalid') || 
        errorMessage.includes('not a valid') || errorMessage.includes('unexpected') ||
        errorMessage.includes('Bad zip file') || errorMessage.includes('Unexpected end of data')) {
      throw new Error('DOCX_PARSING_CORRUPT');
    }
    if (errorMessage.includes('not supported') || errorMessage.includes('format') ||
        errorMessage.includes('Cannot read') || errorMessage.includes('ENOENT')) {
      throw new Error('DOCX_PARSING_FAILED');
    }
    // Re-throw our custom errors as-is
    if (errorMessage.startsWith('DOCX_PARSING_')) {
      throw error;
    }
    throw new Error('DOCX_PARSING_FAILED');
  }
}

// Helper: Extract text from DOC buffer (older Word format)
// Note: mammoth.js primarily supports DOCX. For DOC files (OLE2 format), 
// mammoth may not work. This is a best-effort attempt.
async function extractDOCText(buffer: Buffer): Promise<{ text: string; wasTruncated: boolean }> {
  try {
    // Use require for CommonJS module (mammoth)
    // Note: mammoth primarily supports DOCX, but we'll try it for DOC files
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    let mammoth;
    try {
      mammoth = require('mammoth');
    } catch (moduleError) {
      logger.error('Failed to load mammoth module:', moduleError);
      throw new Error('DOC_PARSING_FAILED: mammoth module not available');
    }
    // Mammoth accepts Buffer directly - no need to convert to ArrayBuffer
    logger.info('DOC extraction: Using Buffer directly with mammoth', {
      bufferLength: buffer.length,
      bufferType: buffer.constructor.name
    });
    
    const result = await mammoth.extractRawText({ buffer });
    const fullText = result.value || '';
    
    // Check for mammoth warnings/messages that indicate issues
    if (result.messages && result.messages.length > 0) {
      logger.warn('DOC extraction warnings:', result.messages);
    }
    
    if (!fullText || typeof fullText !== 'string' || fullText.trim().length === 0) {
      logger.error('DOC extraction returned empty or invalid text:', { 
        result, 
        hasValue: !!result.value,
        valueType: typeof result.value,
        textLength: fullText?.length,
        messages: result.messages 
      });
      throw new Error('DOC_PARSING_FAILED');
    }
    
    if (fullText.length > MAX_CIM_TEXT_CHARS) {
      const truncatedText = fullText.slice(0, MAX_CIM_TEXT_CHARS) + 
        '\n\n[CIM content truncated due to length. Analysis based on first 100,000 characters.]';
      return { text: truncatedText, wasTruncated: true };
    }
    
    return { text: fullText, wasTruncated: false };
  } catch (error) {
    logger.error('DOC extraction failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('DOC extraction error details:', { errorMessage, errorStack });
    
    // Check for specific error types
    if (errorMessage.includes('corrupt') || errorMessage.includes('invalid') || 
        errorMessage.includes('not supported') || errorMessage.includes('Bad zip file') ||
        errorMessage.includes('Unexpected end of data')) {
      throw new Error('DOC_PARSING_CORRUPT');
    }
    // DOC files (OLE2 format) are not well-supported by mammoth
    if (errorMessage.includes('unexpected') || errorMessage.includes('format') || 
        errorMessage.includes('not a valid') || errorMessage.includes('Cannot read') ||
        errorMessage.includes('ENOENT')) {
      throw new Error('DOC_PARSING_FAILED');
    }
    throw new Error('DOC_PARSING_FAILED');
  }
}

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

// Helper: Extract content from Chat Completions response
function extractChatCompletionContent(chatResponse: any): string {
  const content = chatResponse?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }
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
    
    // Check subscription usage limits
    const { allowed, reason } = await canAnalyzeCIM(user.id);
    if (!allowed) {
      const usage = await getCurrentUsage(user.id);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usage limit reached',
          message: reason,
          usage
        },
        { status: 429 }
      );
    }
    
    // Rate limiting (optimized: in-memory first, database only for audit logs)
    const config = getRateLimitConfig('process-cim');
    const rateLimit = await checkRateLimitOptimized(user.id, 'process-cim', config.limit, config.windowSeconds, supabaseUser);
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

    // 1) Download the file directly from Supabase Storage using service role (works for private buckets)
    logger.info('process-cim: Attempting to download file from storage', { cimStoragePath });
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('cims')
      .download(cimStoragePath);

    if (downloadError || !fileData) {
      logger.error('Failed to download CIM file from storage:', {
        error: downloadError,
        cimStoragePath,
        errorMessage: downloadError?.message
      });
      return NextResponse.json({ success: false, error: 'Failed to download CIM file from storage.' }, { status: 500 });
    }

    logger.info('process-cim: file downloaded successfully', {
      cimStoragePath,
      fileSize: fileData.size,
      fileType: fileData.type
    });

    const fileArrayBuffer = await fileData.arrayBuffer();

    // Check for empty or very small files first
    if (fileArrayBuffer.byteLength === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'The uploaded file is empty. Please upload a valid PDF, DOCX, or DOC file.' 
      }, { status: 400 });
    }
    
    if (fileArrayBuffer.byteLength < 100) {
      return NextResponse.json({ 
        success: false, 
        error: `The uploaded file is too small (${fileArrayBuffer.byteLength} bytes). It may be corrupted or incomplete. Please upload a valid PDF, DOCX, or DOC file.` 
      }, { status: 400 });
    }

    // Validate file size
    const sizeCheck = validateFileSize(fileArrayBuffer.byteLength);
    if (!sizeCheck.valid) {
      return NextResponse.json({ success: false, error: sizeCheck.error }, { status: 400 });
    }

    // Get file extension from storage path to help with type detection
    const pathExtension = cimStoragePath.split('.').pop()?.toLowerCase() || '';
    
    // Check if file extension matches expected CIM types
    const validExtensions = ['pdf', 'docx', 'doc'];
    const hasValidExtension = validExtensions.includes(pathExtension);
    
    // Log first few bytes for debugging (only in development)
    if (process.env.NODE_ENV === 'development' && fileArrayBuffer.byteLength > 0) {
      const firstBytes = new Uint8Array(fileArrayBuffer.slice(0, Math.min(20, fileArrayBuffer.byteLength)));
      const hexString = Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
      logger.info('process-cim: First bytes of file', { 
        hex: hexString, 
        ascii: String.fromCharCode(...Array.from(firstBytes).filter(b => b >= 32 && b < 127)),
        extension: pathExtension,
        size: fileArrayBuffer.byteLength 
      });
    }
    
    // Validate file type by magic bytes - support PDF, DOCX, and DOC
    // Note: CSV is NOT in expectedTypes, so CSV detection won't run (prevents false positives)
    const typeCheck = validateFileType(fileArrayBuffer, ['pdf', 'docx', 'doc', 'xlsx', 'xls']); // Include xlsx/xls for detection
    
    if (!typeCheck.valid) {
      // Provide more helpful error message based on file extension
      if (hasValidExtension) {
        // Check if file might be text-based (could help diagnose issues)
        // But skip this for PDFs since they're binary and will show false positives
        let diagnosticInfo = '';
        if (pathExtension !== 'pdf') {
          try {
            const textPreview = new TextDecoder("utf-8", { fatal: false }).decode(
              fileArrayBuffer.slice(0, Math.min(200, fileArrayBuffer.byteLength))
            );
            if (textPreview.trim().length > 0 && !textPreview.includes('%PDF')) {
              const preview = textPreview.substring(0, 100).replace(/\n/g, ' ').trim();
              diagnosticInfo = ` File appears to contain text: "${preview}..."`;
            }
          } catch {
            // Ignore decoding errors
          }
        }
        
        return NextResponse.json({ 
          success: false, 
          error: `The file has a ${pathExtension.toUpperCase()} extension but the file content doesn't match a valid ${pathExtension.toUpperCase()} file.${diagnosticInfo} The file may be corrupted, empty, or not actually a ${pathExtension.toUpperCase()} file. Please re-upload a valid ${pathExtension.toUpperCase()} file.` 
        }, { status: 400 });
      } else if (pathExtension) {
        return NextResponse.json({ 
          success: false, 
          error: `Invalid file type. The file has a .${pathExtension} extension, but only PDF, DOCX, and DOC files are supported for CIM processing.` 
        }, { status: 400 });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: typeCheck.error || 'Invalid file type. Only PDF, DOCX, and DOC files are supported.' 
        }, { status: 400 });
      }
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

    // 3) Extract text from file based on detected type
    logger.info(`process-cim: extracting text from ${detectedType.toUpperCase()}`);
    const fileBuffer = Buffer.from(fileArrayBuffer);
    let extractedText: string;
    let wasTruncated = false;
    
    try {
      let extractionResult: { text: string; wasTruncated: boolean };
      
      if (detectedType === 'pdf') {
        extractionResult = await extractPDFText(fileBuffer);
      } else if (detectedType === 'docx') {
        extractionResult = await extractDOCXText(fileBuffer);
      } else if (detectedType === 'doc') {
        extractionResult = await extractDOCText(fileBuffer);
      } else {
        return NextResponse.json(
          { success: false, error: `Unsupported file type: ${detectedType}. Only PDF, DOCX, and DOC files are supported.` },
          { status: 400 }
        );
      }
      
      extractedText = extractionResult.text;
      wasTruncated = extractionResult.wasTruncated;
      
      if (!extractedText || typeof extractedText !== 'string' || extractedText.trim().length === 0) {
        logger.error(`Text extraction returned empty result for ${detectedType.toUpperCase()}:`, {
          hasText: !!extractedText,
          textType: typeof extractedText,
          textLength: extractedText?.length,
          detectedType
        });
        return NextResponse.json(
          { success: false, error: `Failed to extract text from ${detectedType.toUpperCase()}. The file may be corrupted, image-based, or contain no extractable text. Please try a different file.` },
          { status: 400 }
        );
      }
      logger.info(`CIM text extracted: ${extractedText.length} chars${wasTruncated ? ' (truncated)' : ''}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error(`process-cim: ${detectedType.toUpperCase()} extraction error:`, {
        errorMessage,
        errorStack,
        errorName: error instanceof Error ? error.name : 'Unknown',
        detectedType,
        fileSize: fileArrayBuffer.byteLength,
        pathExtension
      });
      
      // Return user-friendly error messages based on error type
      if (errorMessage === 'PDF_PARSING_ENCRYPTED') {
        return NextResponse.json(
          { success: false, error: 'PDF parsing failed. The file may be encrypted or password-protected. Please upload an unencrypted PDF.' },
          { status: 400 }
        );
      }
      if (errorMessage === 'PDF_PARSING_EMPTY_TEXT' || errorMessage.includes('EMPTY_TEXT')) {
        return NextResponse.json(
          { success: false, error: 'PDF contains no extractable text. The file may be image-based or the text may not be extractable. Please upload a PDF with extractable text.' },
          { status: 400 }
        );
      }
      if (errorMessage === 'PDF_PARSING_CORRUPT' || errorMessage === 'DOCX_PARSING_CORRUPT' || errorMessage === 'DOC_PARSING_FAILED') {
        return NextResponse.json(
          { success: false, error: `${detectedType.toUpperCase()} parsing failed. The file may be corrupted or not a valid ${detectedType.toUpperCase()} file. Please try uploading the file again or use a different file.` },
          { status: 400 }
        );
      }
      if (errorMessage === 'DOCX_PARSING_FAILED' || errorMessage === 'DOC_PARSING_FAILED') {
        // Include more diagnostic info in development
        const diagnosticInfo = process.env.NODE_ENV === 'development' 
          ? ` (Error: ${errorMessage})`
          : '';
        return NextResponse.json(
          { success: false, error: `Failed to extract text from ${detectedType.toUpperCase()}. The file may not be a valid ${detectedType.toUpperCase()} file, may be corrupted, or may contain only images with no extractable text.${diagnosticInfo} Please try a different file or convert it to PDF.` },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Failed to extract text from ${detectedType.toUpperCase()}. Please ensure the file is valid.` },
        { status: 500 }
      );
    }

    // 4) System instructions: strict, buyer-protective, ETA/search & capital-advisor focused
    const instructions = CIM_ANALYSIS_INSTRUCTIONS.template;

    const userText = buildCimAnalysisUserText(companyName);
    const fullUserContent = `${userText}\n\nCIM Content:\n${extractedText}`;

    // 5) Call OpenAI Chat Completions API with extracted text (with retry and exponential backoff)
    const chatRes = await withRetry(
      () =>
        fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo',
            messages: [
              {
                role: 'system',
                content: instructions,
              },
              {
                role: 'user',
                content: fullUserContent,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
          }),
        }),
      { maxRetries: 3, delayMs: 1000, backoff: true }
    );

    if (!chatRes.ok) {
      const errText = await chatRes.text();
      logger.error('OpenAI Chat Completions API error:', { status: chatRes.status, error: errText });
      
      let errorMessage = 'Unable to process CIM document. Please try again later.';
      
      // Handle specific OpenAI API errors
      if (chatRes.status === 429) {
        errorMessage = 'AI analysis rate limit exceeded. Please wait a moment and try again.';
      } else if (chatRes.status === 400) {
        try {
          const errorJson = JSON.parse(errText);
          if (errorJson.error?.message?.includes('context_length') || errorJson.error?.message?.includes('token')) {
            errorMessage = 'This CIM is too large to process. Please upload a smaller file or contact support.';
          } else {
            errorMessage = 'AI analysis failed due to invalid request. Please try again or contact support.';
          }
        } catch {
          errorMessage = 'AI analysis failed. Please try again or contact support.';
        }
      } else if (chatRes.status === 504 || chatRes.status === 408) {
        errorMessage = 'AI analysis timed out. Please try again or contact support.';
      } else if (chatRes.status >= 500) {
        errorMessage = 'AI service is temporarily unavailable. Please try again in a few moments.';
      }
      
      return NextResponse.json({ success: false, error: errorMessage }, { status: chatRes.status >= 500 ? 500 : 400 });
    }

    const chatJson = await chatRes.json();
    const contentText: string = extractChatCompletionContent(chatJson);

    if (!contentText) {
      logger.error('No text content returned from OpenAI Chat Completions API:', chatJson);
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI Chat Completions API did not return any text content. Check logs for details.',
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
    
    // Increment usage after successful processing
    try {
      await incrementCIMUsage(user.id);
    } catch (usageError) {
      logger.error('Failed to increment CIM usage:', usageError);
      // Don't fail the request, just log the error
    }
    
    // Revalidate deal page and dashboard
    if (companyId) {
      revalidatePath(`/deals/${companyId}`);
      revalidatePath('/dashboard');
    }
    
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
