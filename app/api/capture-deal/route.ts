// app/api/capture-deal/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  {
    auth: {
      persistSession: false,
    },
  }
);

// TODO: replace this with YOUR actual Supabase auth user id
const MY_USER_ID = "3025715c-5ff8-425e-9735-0206857e499b";

export async function POST(req: Request) {
  try {
    const { url, title, text } = await req.json();

    if (!url || !text) {
      return NextResponse.json(
        { error: "Missing url or text." },
        { status: 400 }
      );
    }

    const company_name = title || null;

    // -----------------------------
    // 1) AI PROMPT
    // -----------------------------
    const prompt = `
You are helping a search fund / ETA buyer evaluate a lower middle market deal.

Return a JSON object with this EXACT structure:

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
      console.error("OpenAI error:", await aiResponse.text());
      return NextResponse.json(
        { error: "OpenAI API error." },
        { status: 500 }
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

    // Convert final tier to numeric score
    let score: number | null = null;
    const final_tier = scoring?.final_tier;

    if (final_tier === "A") score = 85;
    else if (final_tier === "B") score = 75;
    else if (final_tier === "C") score = 65;

    // -----------------------------
    // 2) INSERT INTO companies, TIED TO YOUR USER_ID
    // -----------------------------
    const { error: insertError } = await supabaseAdmin.from("companies").insert({
      user_id: MY_USER_ID, // 🔑 this makes the deal belong to YOUR account
      company_name,
      listing_url: url,
      raw_listing_text: text,
      source_type: "on_market",

      location_city,
      location_state,
      industry,
      final_tier,
      score,

      ai_summary,
      ai_red_flags,
      ai_financials_json: financials,
      ai_scoring_json: scoring,
      criteria_match_json: criteria_match,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("capture-deal error:", err);
    return NextResponse.json(
      { error: err.message || "Server error." },
      { status: 500 }
    );
  }
}
