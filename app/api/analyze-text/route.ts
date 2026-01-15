// app/api/analyze-text/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_USER_ID = process.env.SEARCHFINDR_DEFAULT_USER_ID;

// Server-side Supabase client using service role (bypasses RLS)
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

if (!OPENAI_API_KEY) {
  logger.warn('OPENAI_API_KEY is not set in environment variables');
}
if (!SUPABASE_URL) {
  logger.warn('NEXT_PUBLIC_SUPABASE_URL is not set');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  logger.warn('SUPABASE_SERVICE_ROLE_KEY is not set');
}
if (!DEFAULT_USER_ID) {
  logger.warn('SEARCHFINDR_DEFAULT_USER_ID is not set');
}

type AnalyzeTextRequest = {
  url: string;
  text: string;
};

export async function POST(req: Request) {
  try {
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

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Server missing OPENAI_API_KEY' },
        { status: 500 }
      );
    }

    if (!supabase || !DEFAULT_USER_ID) {
      return NextResponse.json(
        {
          error:
            'Supabase server-side client not configured. Check SUPABASE_SERVICE_ROLE_KEY and SEARCHFINDR_DEFAULT_USER_ID.',
        },
        { status: 500 }
      );
    }

    // Trim text so we don’t send insane amounts to OpenAI
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
        { error: 'Failed to call OpenAI API', details: textRes },
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
        {
          error: 'Failed to parse AI response as JSON',
          raw: content,
        },
        { status: 500 }
      );
    }

    // Force some fields
    parsed.listing_url = url;
    parsed.source_type = 'on_market';

    // Insert into Supabase as your default user
    const { data: inserted, error: insertError } = await supabase
      .from('companies')
      .insert([
        {
          user_id: DEFAULT_USER_ID,
          ...parsed,
        },
      ])
      .select()
      .single();

    if (insertError) {
      logger.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save deal to database', details: insertError.message },
        { status: 500 }
      );
    }

    // Return the row that was actually saved
    return NextResponse.json({ data: inserted }, { status: 200 });
  } catch (err) {
    logger.error('Unexpected error in /api/analyze-text:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}
