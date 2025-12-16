import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com';

type Body = {
  companyId: string;
};

async function getAuthedUserAndWorkspace(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return { userId: null, workspaceId: null };

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user?.id) return { userId: null, workspaceId: null };

  const userId = userData.user.id;

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', userId)
    .single();

  if (profErr || !profile?.workspace_id) return { userId, workspaceId: null };

  return { userId, workspaceId: profile.workspace_id as string };
}

function tryBuildUrl(base: string, path: string) {
  try {
    const u = new URL(base);
    const baseFixed = u.origin;
    return new URL(path, baseFixed).toString();
  } catch {
    return null;
  }
}

async function fetchWebsiteTextBundle(website: string) {
  const candidates = [
    website,
    tryBuildUrl(website, '/about'),
    tryBuildUrl(website, '/about-us'),
    tryBuildUrl(website, '/our-story'),
    tryBuildUrl(website, '/team'),
    tryBuildUrl(website, '/leadership'),
    tryBuildUrl(website, '/contact'),
  ].filter(Boolean) as string[];

  const uniq = Array.from(new Set(candidates)).slice(0, 4); // V1 cap

  const texts: { url: string; text: string }[] = [];

  for (const url of uniq) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'SearchFindrBot/1.0 (+https://searchfindr.local)',
        },
      });
      if (!res.ok) continue;

      const html = await res.text();
      const cleaned = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 4500); // per-page cap

      if (cleaned) texts.push({ url, text: cleaned });
    } catch {
      // ignore
    }
  }

  const combined = texts
    .map((t) => `SOURCE: ${t.url}\n${t.text}`)
    .join('\n\n---\n\n')
    .slice(0, 12000);

  return { combined, sources: texts.map((t) => t.url) };
}

async function runInitialDiligenceAI(input: {
  companyName: string;
  website: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  ratingsTotal: number | null;
  websiteText: string;
  sources: string[];
}) {
  const prompt = `
You are SearchFindr, an acquisition support system for search funds / ETA buyers.

You are generating "Initial Diligence" from ONLY:
(1) public company website text (limited pages)
(2) basic Google business info (address/phone/rating)

Hard rules:
- Do NOT invent numbers or facts.
- If financials are not present, use null or "Unknown".
- Owner inference should be probabilistic: output a confidence from 0.0 to 1.0.
- If evidence is weak, set likely_owner_operated=false and confidence <= 0.55.

Company:
- Name: ${input.companyName}
- Website: ${input.website}
- Address: ${input.address ?? ''}
- Phone: ${input.phone ?? ''}
- Google rating: ${input.rating ?? ''}
- Ratings count: ${input.ratingsTotal ?? ''}

Sources scanned:
${input.sources.join(', ')}

Website text:
${input.websiteText}

Return ONLY valid JSON in this exact schema:
{
  "ai_summary": "string",
  "ai_red_flags": ["string"],
  "financials": {
    "revenue": "string|null",
    "ebitda": "string|null",
    "margin": "string|null",
    "customer_concentration": "string|null"
  },
  "scoring": {
    "succession_risk": "Low|Medium|High",
    "succession_risk_reason": "string",
    "industry_fit": "High|Medium|Low",
    "industry_fit_reason": "string",
    "geography_fit": "High|Medium|Low",
    "geography_fit_reason": "string",
    "final_tier": "A|B|C",
    "final_tier_reason": "string"
  },
  "criteria_match": {
    "business_model": "string",
    "owner_profile": "string",
    "notes_for_searcher": "string",
    "owner_signals": {
      "likely_owner_operated": boolean,
      "confidence": number,
      "owner_name": "string|null",
      "owner_named_on_site": boolean,
      "years_in_business": "string|null",
      "generation_hint": "founder_led|family_owned|second_gen|unknown",
      "owner_dependency_risk": "Low|Medium|High",
      "evidence": ["string"],
      "missing_info": ["string"]
    }
  }
}
`.trim();

  const res = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error?.message || 'OpenAI request failed');
  }

  const contentRaw = json?.choices?.[0]?.message?.content ?? '';
const content = contentRaw
  .trim()
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/```$/i, '')
  .trim();

return JSON.parse(content);

}

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Missing OPENAI_API_KEY' },
        { status: 500 }
      );
    }

    const { workspaceId } = await getAuthedUserAndWorkspace(req);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as Body;
    const companyId = (body.companyId || '').trim();

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Missing companyId' }, { status: 400 });
    }

    const { data: company, error: loadErr } = await supabase
      .from('companies')
      .select(
        'id, workspace_id, source_type, company_name, website, address, phone, rating, ratings_total'
      )
      .eq('id', companyId)
      .single();

    if (loadErr || !company) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
    }

    if (company.workspace_id !== workspaceId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (company.source_type !== 'off_market') {
      return NextResponse.json({ success: false, error: 'Not an off-market company' }, { status: 400 });
    }

    if (!company.website) {
      return NextResponse.json({ success: false, error: 'No website to analyze' }, { status: 400 });
    }

    const bundle = await fetchWebsiteTextBundle(company.website);
    const websiteText = bundle.combined;

    if (!websiteText) {
      return NextResponse.json(
        { success: false, error: 'Could not fetch website text for analysis' },
        { status: 400 }
      );
    }

    const result = await runInitialDiligenceAI({
      companyName: company.company_name || 'Unknown',
      website: company.website,
      address: company.address ?? null,
      phone: company.phone ?? null,
      rating: company.rating ?? null,
      ratingsTotal: company.ratings_total ?? null,
      websiteText,
      sources: bundle.sources,
    });

    return NextResponse.json({
      success: true,
      ai_summary: result.ai_summary ?? '',
      ai_red_flags: result.ai_red_flags ?? [],
      financials: result.financials ?? {},
      scoring: result.scoring ?? {},
      criteria_match: result.criteria_match ?? {},
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
