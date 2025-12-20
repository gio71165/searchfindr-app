// app/api/process-cim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Server-side admin client (bypasses RLS for DB writes)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

if (!OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set. /api/process-cim will fail until you set it.');
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'Missing Supabase env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  );
}

// Helper: upload PDF bytes to OpenAI Files API and return file_id
async function uploadPdfToOpenAI(pdfArrayBuffer: ArrayBuffer, filename: string) {
  const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('file', pdfBlob, filename || 'cim.pdf');
  formData.append('purpose', 'assistants');

  const res = await fetch(`${OPENAI_BASE_URL}/v1/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
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

// Helper: sometimes model wraps JSON in ```json fences
function stripCodeFences(s: string) {
  const trimmed = (s ?? '').trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }
  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    console.log('process-cim: received request');

    const body = await req.json();
    const companyId = body.companyId as string | undefined;
    let cimStoragePath = body.cimStoragePath as string | undefined;
    let companyName = (body.companyName as string | null) ?? null;

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Missing companyId' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY is not set on the server.' },
        { status: 500 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Supabase server env not set. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 500 }
      );
    }

    // If cimStoragePath wasn't provided, fetch it from the companies row.
    if (!cimStoragePath || !companyName) {
      const { data: companyRow, error: companyErr } = await supabaseAdmin
        .from('companies')
        .select('cim_storage_path, company_name')
        .eq('id', companyId)
        .single();

      if (companyErr) {
        console.error('process-cim: failed to load company row:', companyErr);
        return NextResponse.json(
          { success: false, error: 'Failed to load company row.', details: companyErr.message },
          { status: 500 }
        );
      }

      cimStoragePath = cimStoragePath || (companyRow?.cim_storage_path as string | undefined);
      companyName = companyName || (companyRow?.company_name as string | null) || 'Unknown';
    }

    if (!cimStoragePath) {
      return NextResponse.json(
        { success: false, error: 'Missing cimStoragePath (not in request and not found on company row).' },
        { status: 400 }
      );
    }

    // 1) Build public URL for the CIM PDF (bucket is public)
    const { data: publicUrlData } = supabaseAdmin.storage.from('cims').getPublicUrl(cimStoragePath);

    const publicUrl = publicUrlData?.publicUrl;
    console.log('process-cim: publicUrl', publicUrl);

    if (!publicUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to build public URL for CIM PDF.' },
        { status: 500 }
      );
    }

    // 2) Download the PDF from Supabase
    const pdfRes = await fetch(publicUrl);
    console.log('process-cim: pdf fetch status', pdfRes.status, pdfRes.statusText);

    if (!pdfRes.ok) {
      const err = await pdfRes.text().catch(() => '');
      console.error('Failed to fetch PDF from storage:', pdfRes.status, pdfRes.statusText, err);
      return NextResponse.json(
        { success: false, error: 'Failed to download CIM PDF from storage.' },
        { status: 500 }
      );
    }

    const pdfArrayBuffer = await pdfRes.arrayBuffer();

    // 3) Upload PDF to OpenAI
    const fileId = await uploadPdfToOpenAI(pdfArrayBuffer, `${companyName}.pdf`);

    // 4) System instructions (PASTE YOUR FULL INSTRUCTIONS BLOCK HERE)
    const instructions = `...PASTE YOUR FULL INSTRUCTIONS BLOCK HERE...`.trim();

    const userText = `
Company name: ${companyName}.

Analyze the attached CIM PDF and populate the JSON schema from the instructions for a professional ETA/search-fund buyer and capital advisor. Return ONLY JSON, no additional commentary.
    `.trim();

    // 5) Call OpenAI Responses API
    const responsesRes = await fetch(`${OPENAI_BASE_URL}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        instructions,
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
      return NextResponse.json(
        { success: false, error: 'OpenAI Responses API error', details: errText },
        { status: 500 }
      );
    }

    const responsesJson = await responsesRes.json();

    const contentText: string =
      responsesJson.output_text ?? responsesJson.output?.[0]?.content?.[0]?.text ?? '';

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
      ai_red_flags: string[];
      financials: any;
      scoring: any;
      criteria_match: any;
    };

    try {
      parsed = JSON.parse(stripCodeFences(contentText));
    } catch (jsonErr) {
      console.error('Failed to parse OpenAI JSON:', jsonErr, contentText);
      return NextResponse.json(
        { success: false, error: 'Failed to parse OpenAI response as JSON. Check logs.' },
        { status: 500 }
      );
    }

    // ✅ 6) Persist to companies (THIS is what makes the UI populate)
    const updatePayload: any = {
      ai_summary: parsed.ai_summary ?? null,
      ai_red_flags: parsed.ai_red_flags ?? [],
      ai_financials_json: parsed.financials ?? {},
      ai_scoring_json: parsed.scoring ?? {},
      criteria_match_json: parsed.criteria_match ?? {},
    };

    // Optional: if you store tier on companies.final_tier
    if (parsed?.scoring?.final_tier) {
      updatePayload.final_tier = parsed.scoring.final_tier;
    }

    const { error: updateErr } = await supabaseAdmin
      .from('companies')
      .update(updatePayload)
      .eq('id', companyId);

    if (updateErr) {
      console.error('process-cim: failed to update companies row:', updateErr);
      return NextResponse.json(
        { success: false, error: 'Failed to save CIM analysis to database.', details: updateErr.message },
        { status: 500 }
      );
    }

    console.log('process-cim: saved analysis to companies', companyId);

    return NextResponse.json({
      success: true,
      companyId,
      deal_verdict: parsed.deal_verdict,
      ai_summary: parsed.ai_summary,
      ai_red_flags: parsed.ai_red_flags,
      financials: parsed.financials,
      scoring: parsed.scoring,
      criteria_match: parsed.criteria_match,
    });
  } catch (err) {
    console.error('Unexpected error in process-cim:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected server error in process-cim.' },
      { status: 500 }
    );
  }
}
