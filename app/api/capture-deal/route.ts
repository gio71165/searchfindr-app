// app/api/capture-deal/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Searchfindr-Key, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    // 1) API key
    const apiKey = req.headers.get("x-searchfindr-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing X-Searchfindr-Key header." },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2) Resolve user + workspace
    const { data: keyRow, error: keyError } = await supabaseAdmin
      .from("user_api_keys")
      .select("user_id, workspace_id")
      .eq("api_key", apiKey)
      .single();

    if (keyError || !keyRow?.user_id) {
      return NextResponse.json(
        { error: "Invalid API key." },
        { status: 401, headers: corsHeaders }
      );
    }

const ownerUserId = keyRow.user_id as string | null;
const workspaceId = keyRow.workspace_id as string;

if (!workspaceId) {
  return NextResponse.json(
    { error: "API key missing workspace_id." },
    { status: 401, headers: corsHeaders }
  );
}


    // 3) Body
    const body = await req.json();
    const url = body?.url;
    const title = body?.title;
    const text = body?.text;

    if (!url || !text) {
      return NextResponse.json(
        { error: "Missing url or text." },
        { status: 400, headers: corsHeaders }
      );
    }

    const company_name = title || null;

    // 4) Prompt (NO backticks)
    const prompt =
      "You are helping a search fund / ETA buyer evaluate a lower middle market deal.\n\n" +
      "Return a JSON object with the following shape:\n\n" +
      '{\n' +
      '  "ai_summary": "",\n' +
      '  "ai_red_flags": "",\n' +
      '  "financials": {\n' +
      '    "revenue": "",\n' +
      '    "ebitda": "",\n' +
      '    "margin": "",\n' +
      '    "customer_concentration": ""\n' +
      "  },\n" +
      '  "scoring": {\n' +
      '    "succession_risk": "",\n' +
      '    "succession_risk_reason": "",\n' +
      '    "industry_fit": "",\n' +
      '    "industry_fit_reason": "",\n' +
      '    "geography_fit": "",\n' +
      '    "geography_fit_reason": "",\n' +
      '    "final_tier": "",\n' +
      '    "final_tier_reason": ""\n' +
      "  },\n" +
      '  "criteria_match": {\n' +
      '    "deal_size": "",\n' +
      '    "business_model": "",\n' +
      '    "owner_profile": "",\n' +
      '    "notes_for_searcher": ""\n' +
      "  },\n" +
      '  "location_city": "",\n' +
      '  "location_state": "",\n' +
      '  "industry": ""\n' +
      "}\n\n" +
      "Company:\n- Name: " +
      (company_name || "") +
      "\n- URL: " +
      url +
      "\n\n" +
      'Listing:\n"""' +
      text +
      '"""\n';

    // 5) OpenAI
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a precise M&A analyst for search funds." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return NextResponse.json(
        { error: errText },
        { status: 500, headers: corsHeaders }
      );
    }

    const aiJSON = await aiResponse.json();
    const parsed = JSON.parse(aiJSON.choices[0].message.content);

    const {
      ai_summary,
      ai_red_flags,
      financials,
      scoring,
      criteria_match,
      location_city,
      location_state,
      industry,
    } = parsed;

    let score: number | null = null;
    if (scoring?.final_tier === "A") score = 85;
    else if (scoring?.final_tier === "B") score = 75;
    else if (scoring?.final_tier === "C") score = 65;

    // 6) Insert
    const { error: insertError } = await supabaseAdmin.from("companies").insert({
      workspace_id: workspaceId,
      user_id: ownerUserId ?? null,
      company_name,
      listing_url: url,
      raw_listing_text: text,
      source_type: "on_market",
      location_city: location_city ?? null,
      location_state: location_state ?? null,
      industry: industry ?? null,
      final_tier: scoring?.final_tier ?? null,
      score,
      ai_summary: ai_summary ?? null,
      ai_red_flags: ai_red_flags ?? null,
      ai_financials_json: financials ?? null,
      ai_scoring_json: scoring ?? null,
      criteria_match_json: criteria_match ?? null,
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
