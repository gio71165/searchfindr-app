import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function resolveWorkspaceId(userId: string): Promise<string | null> {
  // Option A: profiles.workspace_id
  const prof = await supabaseAdmin
    .from('profiles')
    .select('workspace_id')
    .eq('id', userId)
    .maybeSingle();

  if (prof.data?.workspace_id) return prof.data.workspace_id;

  // Option B: workspace_members table
  const mem = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (mem.data?.workspace_id) return mem.data.workspace_id;

  return null;
}

function cleanText(s: string) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWebsiteText(url: string) {
  // Normalize: if user stored without scheme
  const normalized =
    url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

  const res = await fetch(normalized, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; SearchFindrBot/1.0; +https://searchfindr.example)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  const html = await res.text();
  // Keep it bounded — OpenAI doesn’t need 2MB
  const text = cleanText(html).slice(0, 12000);

  return { normalizedUrl: normalized, status: res.status, text };
}

async function runOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com';

  if (!apiKey) throw new Error('OPENAI_API_KEY is not set.');

  const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an investment analyst for SMB acquisitions. Return ONLY valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const raw = await resp.text();
  let json: any = null;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`OpenAI returned non-JSON: ${raw.slice(0, 300)}`);
  }

  if (!resp.ok) {
    throw new Error(json?.error?.message || `OpenAI error HTTP ${resp.status}`);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty content.');

  let parsed: any = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Model output was not JSON: ${content.slice(0, 300)}`);
  }

  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing Bearer token.' },
        { status: 401 }
      );
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session.' },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const companyId = body?.companyId as string | undefined;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Missing companyId.' },
        { status: 400 }
      );
    }

    const workspaceId = await resolveWorkspaceId(userId);
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'No workspace found for user.' },
        { status: 403 }
      );
    }

    // Fetch company (workspace safe; fallback for legacy rows)
    let company: any | null = null;

    const primary = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (primary.data) company = primary.data;

    if (!company) {
      const fallback = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      if (!fallback.data) {
        return NextResponse.json(
          { success: false, error: 'Company not found.' },
          { status: 404 }
        );
      }

      company = fallback.data;

      if (!company.workspace_id) {
        const attach = await supabaseAdmin
          .from('companies')
          .update({ workspace_id: workspaceId })
          .eq('id', companyId);

        if (attach.error) {
          return NextResponse.json(
            { success: false, error: `Failed to attach workspace_id: ${attach.error.message}` },
            { status: 500 }
          );
        }
        company.workspace_id = workspaceId;
      } else if (company.workspace_id !== workspaceId) {
        return NextResponse.json(
          { success: false, error: 'Company not found in your workspace.' },
          { status: 404 }
        );
      }
    }

    if (company.source_type && company.source_type !== 'off_market') {
      return NextResponse.json(
        { success: false, error: 'This endpoint is only for off-market companies.' },
        { status: 400 }
      );
    }

    const website = company.website as string | null;
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Company has no website stored. Cannot run off-market diligence.' },
        { status: 400 }
      );
    }

    // 1) Pull website text
    const { normalizedUrl, status, text } = await fetchWebsiteText(website);

    if (!text || text.length < 200) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not extract enough website content (HTTP ${status}).`,
        },
        { status: 400 }
      );
    }

    // 2) Ask model for diligence output (JSON)
    const prompt = `
Company:
- name: ${company.company_name || ''}
- address: ${company.address || ''}
- city/state: ${company.location_city || ''}, ${company.location_state || ''}
- website: ${normalizedUrl}
- google_rating: ${company.rating ?? ''}
- ratings_total: ${company.ratings_total ?? ''}

Website extracted text:
"""${text}"""

Task:
Return a JSON object with EXACT keys:
{
  "ai_summary": string (8-14 bullet lines, concise, investor memo),
  "ai_red_flags": string[] (0-10 items),
  "financials": {
    "revenue": string|null,
    "ebitda": string|null,
    "margin": string|null,
    "customer_concentration": string|null
  },
  "scoring": {
    "succession_risk": "Low"|"Medium"|"High"|null,
    "succession_risk_reason": string|null,
    "industry_fit": "Tier A"|"Tier B"|"Tier C"|null,
    "industry_fit_reason": string|null,
    "geography_fit": "Tier A"|"Tier B"|"Tier C"|null,
    "geography_fit_reason": string|null,
    "final_tier": "A"|"B"|"C"|null,
    "final_tier_reason": string|null
  },
  "criteria_match": {
    "business_model": string|null,
    "owner_profile": string|null,
    "notes_for_searcher": string|null,
    "owner_signals": {
      "likely_owner_operated": boolean|null,
      "confidence": number|null,
      "owner_named_on_site": boolean|null,
      "owner_name": string|null,
      "generation_hint": string|null,
      "owner_dependency_risk": string|null,
      "years_in_business": string|null,
      "evidence": string[],
      "missing_info": string[]
    }
  }
}

Rules:
- If financials are not explicitly stated, set them to null (do NOT hallucinate numbers).
- Keep "final_tier" as "A"/"B"/"C" ONLY.
- Use plain language, no marketing fluff.
`;

    const out = await runOpenAI(prompt);

    const ai_summary = String(out?.ai_summary || '').trim();
    const ai_red_flags = Array.isArray(out?.ai_red_flags) ? out.ai_red_flags.map(String) : [];
    const financials = typeof out?.financials === 'object' && out.financials ? out.financials : {};
    const scoring = typeof out?.scoring === 'object' && out.scoring ? out.scoring : {};
    const criteria_match =
      typeof out?.criteria_match === 'object' && out.criteria_match ? out.criteria_match : {};

    if (!ai_summary) {
      return NextResponse.json(
        { success: false, error: 'AI returned empty summary.' },
        { status: 500 }
      );
    }

    // 3) Save to companies
    const upd = await supabaseAdmin
      .from('companies')
      .update({
        ai_summary,
        ai_red_flags,
        ai_financials_json: financials,
        ai_scoring_json: scoring,
        criteria_match_json: criteria_match,
      })
      .eq('id', companyId)
      .eq('workspace_id', workspaceId);

    if (upd.error) {
      return NextResponse.json(
        { success: false, error: `Failed to save diligence: ${upd.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ai_summary,
      ai_red_flags,
      financials,
      scoring,
      criteria_match,
    });
  } catch (e: any) {
    console.error('off-market diligence route error:', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Server error.' },
      { status: 500 }
    );
  }
}
