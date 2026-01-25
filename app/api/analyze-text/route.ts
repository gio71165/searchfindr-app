// app/api/analyze-text/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { checkRateLimit, getRateLimitConfig } from '@/lib/api/rate-limit';
import { validateInputLength } from '@/lib/api/security';
import { logger } from '@/lib/utils/logger';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Input length limits
const MAX_TEXT_LENGTH = 50000; // 50KB
const MAX_URL_LENGTH = 2048;

type AnalyzeTextRequest = {
  url: string;
  text: string;
};

export async function POST(req: NextRequest) {
  let user: { id: string } | null = null;
  try {
    // 1) Authentication - CRITICAL FIX
    const authResult = await authenticateRequest(req);
    const { supabase, user: authUser, workspace } = authResult;
    user = authUser;
    const deals = new DealsRepository(supabase, workspace.id);

    // 2) Rate limiting
    const config = getRateLimitConfig('analyze-text');
    const rateLimit = await checkRateLimit(authUser.id, 'analyze-text', config.limit, config.windowSeconds, supabase);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Maximum ${config.limit} requests per hour. Please try again later.` },
        { status: 429 }
      );
    }

    // 3) Request body validation
    const body = (await req.json()) as AnalyzeTextRequest;
    const { url, text } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "url" in request body.' },
        { status: 400 }
      );
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "text" in request body.' },
        { status: 400 }
      );
    }

    // 4) Input length validation
    const urlLengthError = validateInputLength(url, MAX_URL_LENGTH, 'URL');
    if (urlLengthError) {
      return NextResponse.json({ error: urlLengthError }, { status: 400 });
    }

    const textLengthError = validateInputLength(text, MAX_TEXT_LENGTH, 'Text');
    if (textLengthError) {
      return NextResponse.json({ error: textLengthError }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      logger.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again later.' },
        { status: 500 }
      );
    }

    // Trim text so we don't send insane amounts to OpenAI
    const cleanedText = text.replace(/\s+/g, ' ').trim().slice(0, 12000);

    const prompt = `
You are an analyst for a small private equity / search fund deal flow platform called SearchFindr.

You will receive raw text from an online business-for-sale listing (already cleaned and extracted from the HTML by a browser extension).
Your job is to extract and summarize the deal into a strict JSON object compatible with this database schema:

- company_name: string
- location_city: string | null
- location_state: string | null
- industry: string | null
- source_type: "on_market"
- revenue_band: string | null              // e.g. "$1–3M", "$3–5M", "<$1M"
- ebidta_band: string | null               // NOTE: keep the key NAME exactly "ebidta_band"
- owner_name: string | null
- owner_age_band: string | null            // e.g. "50–60", "60–70", or null if unknown
- owner_role: string | null                // e.g. "Founder-operated", "Second-generation family", etc.
- succession_risk: number | null           // 1 = low risk / lots of time, 2 = medium, 3 = near-term transition
- industry_fit: number | null              // 1 = very attractive, 2 = neutral, 3 = weak
- geography_fit: number | null             // 1 = core focus geography, 2 = acceptable, 3 = outside focus
- acquisition_complexity: string | null    // short label like "Low", "Medium", "High"
- score: number | null                     // 0–100 overall SearchFindr score you assign
- final_tier: string | null                // "A", "B", or "C"
- summary: string | null                   // 2–4 sentence overview
- why_it_fits: string | null               // 2–4 bullet-style sentences (as a single string)
- key_risks: string | null                 // 2–4 bullet-style sentences (as a single string)
- listing_url: string                      // echo back the original URL exactly

Rules:
- If a field is not clearly stated, set it to null (do NOT invent specific numbers or identities).
- Always set source_type to "on_market".
- Be conservative and realistic with score (0–100) and final_tier (A/B/C).
- Make sure the JSON is valid, with double quotes around keys and strings.
- Do NOT wrap the JSON in backticks or any extra text. Only return the JSON object.

Here is the listing text:

"""${cleanedText}"""
`;

    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a precise JSON-generating assistant for a deal sourcing platform. Always return STRICT valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!openAiRes.ok) {
      const textRes = await openAiRes.text();
      logger.error('OpenAI API error:', textRes);
      return NextResponse.json(
        { error: 'Failed to process request. Please try again later.' },
        { status: 502 }
      );
    }

    const openAiJson = await openAiRes.json();
    const content = openAiJson.choices?.[0]?.message?.content ?? '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      logger.error('Failed to parse OpenAI JSON:', err, 'content:', content);
      return NextResponse.json(
        { error: 'Failed to process AI response. Please try again.' },
        { status: 500 }
      );
    }

    // Force some fields
    parsed.listing_url = url;
    parsed.source_type = 'on_market';

    // Insert into Supabase with proper workspace and user scoping
    const inserted = await deals.create({
      user_id: authUser.id,
      ...parsed,
    });

    // Return the row that was actually saved
    return NextResponse.json({ data: inserted }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Authentication failed. Please check your credentials." }, { status: err.statusCode });
    }
    const { handleApiError } = await import("@/lib/api/error-handler");
    return handleApiError(err, { endpoint: "analyze-text", userId: user?.id });
  }
}
