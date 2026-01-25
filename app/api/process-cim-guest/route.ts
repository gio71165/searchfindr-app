// app/api/process-cim-guest/route.ts
// Anonymous CIM upload for homepage - returns preview results
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CIM_ANALYSIS_INSTRUCTIONS, buildCimAnalysisUserText } from '@/lib/prompts/cim-analysis';
import { validateFileSize, validateFileType } from '@/lib/api/file-validation';
import { sanitizeShortText } from '@/lib/utils/sanitize';
import { logger } from '@/lib/utils/logger';
import { withRetry } from '@/lib/utils/retry';
import { extractText, getDocumentProxy } from 'unpdf';
import { sendEmail } from '@/lib/utils/email';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max

const MAX_CIM_TEXT_CHARS = 100000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Guest files expire after 24 hours
const GUEST_FILE_EXPIRY_HOURS = 24;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Rate limiting for guest uploads (by IP)
const guestRateLimit = new Map<string, { count: number; resetAt: number }>();
const GUEST_RATE_LIMIT = 3; // 3 uploads per hour per IP
const GUEST_RATE_WINDOW = 3600000; // 1 hour

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIP || 'unknown';
}

function checkGuestRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = guestRateLimit.get(ip);

  if (!entry || entry.resetAt < now) {
    guestRateLimit.set(ip, { count: 1, resetAt: now + GUEST_RATE_WINDOW });
    return { allowed: true, remaining: GUEST_RATE_LIMIT - 1 };
  }

  entry.count += 1;
  const remaining = Math.max(0, GUEST_RATE_LIMIT - entry.count);
  const allowed = entry.count <= GUEST_RATE_LIMIT;

  return { allowed, remaining };
}

async function extractPDFText(buffer: Buffer): Promise<{ text: string; wasTruncated: boolean }> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const fullText = (text ?? '').trim();

    if (!fullText) {
      throw new Error('PDF_PARSING_EMPTY_TEXT');
    }

    if (fullText.length > MAX_CIM_TEXT_CHARS) {
      const truncatedText = fullText.slice(0, MAX_CIM_TEXT_CHARS) + '\n\n[Content truncated...]';
      return { text: truncatedText, wasTruncated: true };
    }

    return { text: fullText, wasTruncated: false };
  } catch (error) {
    logger.error('PDF extraction failed:', error);
    throw new Error('PDF_PARSING_FAILED');
  }
}

async function extractDOCText(buffer: Buffer): Promise<{ text: string; wasTruncated: boolean }> {
  try {
    // Use require for CommonJS module (mammoth)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    let mammoth;
    try {
      mammoth = require('mammoth');
    } catch (moduleError) {
      logger.error('Failed to load mammoth module:', moduleError);
      throw new Error('DOC_PARSING_FAILED: mammoth module not available');
    }
    
    const result = await mammoth.extractRawText({ buffer });
    const fullText = (result.value ?? '').trim();

    if (!fullText) {
      throw new Error('DOC_PARSING_EMPTY_TEXT');
    }

    if (fullText.length > MAX_CIM_TEXT_CHARS) {
      const truncatedText = fullText.slice(0, MAX_CIM_TEXT_CHARS) + '\n\n[Content truncated...]';
      return { text: truncatedText, wasTruncated: true };
    }

    return { text: fullText, wasTruncated: false };
  } catch (error) {
    logger.error('DOC extraction failed:', error);
    throw new Error('DOC_PARSING_FAILED');
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const email = formData.get('email') as string | null;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }

    // Check if email has already uploaded (limit to 1 per email)
    const { data: existingUpload, error: checkError } = await supabaseAdmin
      .from('guest_cim_uploads')
      .select('email, uploaded_at')
      .eq('email', email.toLowerCase().trim())
      .limit(1)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('Error checking guest upload:', checkError);
    }

    if (existingUpload) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Upload limit reached', 
          message: 'You have already uploaded a CIM with this email address. Sign up for unlimited access.'
        },
        { status: 429 }
      );
    }

    // Rate limiting by IP (as backup)
    const clientIP = getClientIP(req);
    const rateLimit = checkGuestRateLimit(clientIP);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded', 
          message: `You've reached the limit of ${GUEST_RATE_LIMIT} free analyses. Sign up for unlimited access.`,
          remaining: rateLimit.remaining
        },
        { status: 429 }
      );
    }

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file size first
    const sizeCheck = validateFileSize(file.size);
    if (!sizeCheck.valid) {
      return NextResponse.json({ success: false, error: sizeCheck.error || 'File too large. Maximum size is 25MB.' }, { status: 400 });
    }

    // Convert file to buffer for type validation
    const arrayBuffer = await file.arrayBuffer();
    const typeCheck = validateFileType(arrayBuffer, ['pdf', 'docx', 'doc']);
    if (!typeCheck.valid) {
      return NextResponse.json({ success: false, error: typeCheck.error || 'Invalid file type. Please upload a PDF, DOCX, or DOC file.' }, { status: 400 });
    }

    // Upload to temporary guest storage
    const fileExt = (file.name.split('.').pop() || '').toLowerCase() || 'pdf';
    const fileName = `guest-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `guest/${fileName}`;

    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage (will auto-expire based on bucket policy)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('cims')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Guest CIM upload error:', uploadError);
      return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
    }

    // Extract text
    let extractedText: string;
    let wasTruncated: boolean;

    if (file.type === 'application/pdf') {
      const result = await extractPDFText(buffer);
      extractedText = result.text;
      wasTruncated = result.wasTruncated;
    } else {
      const result = await extractDOCText(buffer);
      extractedText = result.text;
      wasTruncated = result.wasTruncated;
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Could not extract text from file. The file may be image-based or corrupted.' }, { status: 400 });
    }

    // Analyze with OpenAI (preview version - limited response)
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'Analysis service unavailable' }, { status: 500 });
    }

    // Build user text - use extracted text as company name placeholder since we don't have company name for guest uploads
    const userText = buildCimAnalysisUserText('Unknown Company');
    const fullUserContent = `${userText}\n\nCIM Content:\n${extractedText}${wasTruncated ? '\n\n[Note: Content was truncated due to length]' : ''}`;
    const systemPrompt = CIM_ANALYSIS_INSTRUCTIONS.template;

    const analysisResponse = await withRetry(
      () =>
        fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: fullUserContent },
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        }),
      { maxRetries: 2, delayMs: 1000 }
    );

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      logger.error('OpenAI analysis error:', errorText);
      return NextResponse.json({ success: false, error: 'Analysis failed. Please try again.' }, { status: 500 });
    }

    const analysisData = await analysisResponse.json();
    const content = analysisData.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ success: false, error: 'No analysis returned' }, { status: 500 });
    }

    let analysisJson: any;
    try {
      analysisJson = JSON.parse(content);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid analysis response' }, { status: 500 });
    }

    // Record the upload
    const normalizedEmail = email.toLowerCase().trim();
    const { error: insertError } = await supabaseAdmin
      .from('guest_cim_uploads')
      .insert({
        email: normalizedEmail,
        file_path: filePath,
        uploaded_at: new Date().toISOString(),
      });

    if (insertError) {
      logger.error('Error recording guest upload:', insertError);
      // Don't fail the request, just log the error
    }

    // Format analysis results for email
    const verdict = analysisJson.decision_framework?.verdict || 'UNKNOWN';
    const verdictColor = verdict === 'PROCEED' ? '#10b981' : verdict === 'PARK' ? '#f59e0b' : '#ef4444';
    const tier = analysisJson.scoring?.final_tier || 'Unknown';
    const summary = analysisJson.ai_summary || 'Analysis complete';
    const redFlags = Array.isArray(analysisJson.ai_red_flags) 
      ? analysisJson.ai_red_flags.slice(0, 5).map((flag: any) => {
          const flagText = typeof flag === 'string' ? flag : (flag?.flag || String(flag));
          return flagText;
        })
      : [];

    // Send analysis results email to guest user
    try {
      const guestEmailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Your CIM Analysis is Ready</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; margin-top: 0;">Your CIM analysis for <strong>${file.name}</strong> is complete.</p>
              
              ${verdict !== 'UNKNOWN' ? `
                <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${verdictColor};">
                  <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e293b;">Verdict</p>
                  <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${verdictColor};">${verdict}</p>
                  ${analysisJson.decision_framework?.primary_reason ? `
                    <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">${analysisJson.decision_framework.primary_reason}</p>
                  ` : ''}
                </div>
              ` : ''}

              ${tier !== 'Unknown' ? `
                <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0 0 5px 0; font-weight: 600; color: #1e293b; font-size: 14px;">Deal Tier</p>
                  <p style="margin: 0; font-size: 20px; font-weight: bold; color: #334155;">Tier ${tier}</p>
                </div>
              ` : ''}

              ${summary ? `
                <div style="margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e293b;">Summary</p>
                  <p style="margin: 0; color: #64748b; line-height: 1.6;">${summary}</p>
                </div>
              ` : ''}

              ${redFlags.length > 0 ? `
                <div style="margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e293b;">Key Red Flags</p>
                  <ul style="margin: 0; padding-left: 20px; color: #ef4444;">
                    ${redFlags.map((flag: string) => `<li style="margin-bottom: 8px;">${flag}</li>`).join('')}
                  </ul>
                  ${analysisJson.ai_red_flags && analysisJson.ai_red_flags.length > 5 ? `
                    <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px; font-style: italic;">
                      +${analysisJson.ai_red_flags.length - 5} more red flags...
                    </p>
                  ` : ''}
                </div>
              ` : ''}

              <div style="background: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-weight: 600; margin-bottom: 10px;">This is a preview</p>
                <p style="margin: 0; color: #78350f; font-size: 14px;">
                  Sign up for full access to see the complete analysis, save deals, track your pipeline, and get unlimited CIM analyses.
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.searchfindr.app'}/signup" 
                   style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px;">
                  Sign Up for Full Access
                </a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.searchfindr.app'}/pricing" 
                   style="display: inline-block; background: #64748b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View Pricing
                </a>
              </div>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              This is an automated email from SearchFindr
            </p>
          </body>
        </html>
      `;

      await sendEmail({
        to: normalizedEmail,
        subject: `Your CIM Analysis Results - ${file.name}`,
        html: guestEmailHtml,
      });
    } catch (emailError) {
      logger.error('Error sending results email to guest:', emailError);
      // Don't fail the request if email fails
    }

    // Send notification email to gio@searchfindr.net
    try {
      await sendEmail({
        to: 'gio@searchfindr.net',
        subject: `New Guest CIM Upload - ${normalizedEmail}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">New Guest CIM Upload</h1>
              </div>
              <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; margin-top: 0;">A new guest has uploaded a CIM for analysis.</p>
                <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${normalizedEmail}</p>
                  <p style="margin: 0 0 10px 0;"><strong>File:</strong> ${file.name}</p>
                  <p style="margin: 0 0 10px 0;"><strong>File Path:</strong> ${filePath}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Verdict:</strong> ${verdict}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Tier:</strong> ${tier}</p>
                  <p style="margin: 0;"><strong>Uploaded At:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
                  This email was sent automatically when a guest uploaded a CIM on the "Try It" page.
                </p>
              </div>
            </body>
          </html>
        `,
      });
    } catch (emailError) {
      logger.error('Error sending notification email:', emailError);
      // Don't fail the request if email fails
    }

    // Return preview results (limited data)
    return NextResponse.json({
      success: true,
      preview: true, // Indicates this is a preview
      analysis: {
        ai_summary: analysisJson.ai_summary || 'Analysis complete',
        ai_red_flags: analysisJson.ai_red_flags || [],
        scoring: {
          final_tier: analysisJson.scoring?.final_tier || 'Unknown',
          data_confidence: analysisJson.scoring?.data_confidence || 'Unknown',
        },
        decision_framework: {
          verdict: analysisJson.decision_framework?.verdict || 'UNKNOWN',
          primary_reason: analysisJson.decision_framework?.primary_reason || '',
        },
        // Limited financials preview
        financials: analysisJson.financials ? {
          revenue: analysisJson.financials.revenue,
          ebitda: analysisJson.financials.ebitda,
        } : null,
      },
      filePath, // Store for potential signup conversion
      message: 'Sign up to see full analysis, save deals, and get unlimited access.',
    });

  } catch (error) {
    logger.error('Guest CIM processing error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
