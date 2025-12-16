```ts
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
  "Access-Control-Allow-Headers": "Content-Type, X-Searchfindr-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    // 1) Read API key
    const apiKey = req.headers.get("x-searchfindr-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing X-Searchfindr-Key header." },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2) Lookup user_id for this API key
    const { data: keyRow, error: keyError } = await supabaseAdmin
      .from("user_api_keys")
      .select("user_id")
      .eq("api_key", apiKey)
      .single();

    if (keyError || !keyRow?.user_id) {
      return NextResponse.json(
        { error: "Invalid API key." },
        { status: 401, headers: corsHeaders }
      );
    }

    const ownerUserId = keyRow.user_id;

    // 3) Resolve workspace_id for that user (NEW)
    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("workspace_id")
      .eq("id", ownerUserId)
      .single();

    if (profileError || !profileRow?.workspace_id) {
      return NextResponse.json(
        { error: "User has no workspace/profile configured." },
        { status: 400, headers: corsHeaders }
      );
    }

    const workspaceId = profileRow.workspace_id;

    // 4) Extract data from extension
    const { url, title, text } = await req.json();

    if (!url || !text) {
      return NextResponse.json(
        { error: "Missing url or text." },
        { status: 400, headers: corsHeaders }
      );
    }

    const company_name = title || null;

    // 5) AI prompt
    const prompt = `
You are helping a search fund / ETA buyer evaluate a lower middle market deal.

Return a JSON object with the following shape:

{
  "ai_summary": "",
  "ai_red_flags": "",
  "financials": {
    "revenue": "",
    "ebitda": "",
    "margin": "",
    "customer_concentration": ""
  },
  "scoring": {
    "succession_risk": "",
    "succession_risk_reason": "",
    "industry_fit": "",
    "industry_fit_reason": "",
    "geography_fit": "",
    "geography_fit_reason": "",
    "final_tier": "",
    "final_tier_reason": ""
  },
  "criteria_match": {
    "deal_size": "",
    "business_model": "",
    "owner_profile": "",
    "notes_for_searcher": ""
  },
  "location_city": "",
  "location_state": "",
  "industry": ""
}

Company:
- Name: ${company_name || ""}
- URL: ${url}

Listing:
"""${text}"""
`;
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
  console.error("OpenAI RAW ERROR:", errText);
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

    // Numeric score for dashboard (keep for now if your UI expects it)
    let score: number | null = null;
    if (scoring?.final_tier === "A") score = 85;
    else if (scoring?.final_tier === "B") score = 75;
    else if (scoring?.final_tier === "C") score = 65;

    // 6) Insert deal (NEW: workspace_id)
    const { error: insertError } = await supabaseAdmin.from("companies").insert({
      workspace_id: workspaceId, // NEW
      user_id: ownerUserId,      // keep as created_by / audit
      company_name,
      listing_url: url,
      raw_listing_text: text,
      source_type: "on_market",
      location_city,
      location_state,
      industry,
      final_tier: scoring?.final_tier ?? null,
      score,
      ai_summary: ai_summary ?? null,
      ai_red_flags: ai_red_flags ?? null,
      ai_financials_json: financials ?? null,
      ai_scoring_json: scoring ?? null,
      criteria_match_json: criteria_match ?? null,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
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
    console.error("capture-deal error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
```
