// app/api/analyze-deal/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const {
      listingText,
      companyName,
      city,
      state,
      sourceType,
      listingUrl,
    } = await req.json();

    if (!listingText || listingText.trim().length === 0) {
      return NextResponse.json(
        { error: "No listing text provided." },
        { status: 400 }
      );
    }

    //
    // 🧠 AI PROMPT
    //
    const prompt = `
You are helping a search fund / ETA buyer evaluate a lower middle market deal.

You will be given:
- Basic deal info (company name, location, source, etc.)
- Raw listing text

Return a JSON object with this EXACT structure:

{
  "ai_summary": "High-level narrative of the business and opportunity.",
  "ai_red_flags": "Bullet-style text of key risks / concerns.",
  "financials": {
    "revenue": "Text version of revenue (e.g. '$3–4M, growing ~10% YoY')",
    "ebitda": "Text version of EBITDA (e.g. '$700–900k')",
    "margin": "EBITDA margin description if you can infer it",
    "customer_concentration": "Any key account risk or 'Not mentioned'"
  },
  "scoring": {
    "succession_risk": "Low | Medium | High",
    "succession_risk_reason": "Short explanation",
    "industry_fit": "Tier A | Tier B | Tier C",
    "industry_fit_reason": "Short explanation",
    "geography_fit": "Tier A | Tier B | Tier C",
    "geography_fit_reason": "Short explanation",
    "final_tier": "A | B | C",
    "final_tier_reason": "Short explanation"
  },
  "criteria_match": {
    "deal_size": "Fit vs typical $2–5M EBITDA target",
    "business_model": "Recurring / sticky / boring?",
    "owner_profile": "Age / retirement / succession notes",
    "notes_for_searcher": "Actionable takeaways"
  }
}

DO NOT add any extra keys.
Use only info stated or strongly implied in the listing.

Company:
- Name: ${companyName || ""}
- Location: ${city || ""} ${state || ""}
- Source: ${sourceType || ""}
- URL: ${listingUrl || ""}

Listing Text:
"""${listingText}"""
    `;

    //
    // 🧠 CALL OPENAI
    //
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
        response_format: { type: "json_object" }, // forces perfect JSON
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error("OpenAI error:", errorBody);
      return NextResponse.json(
        { error: "OpenAI API error. Check server logs." },
        { status: 500 }
      );
    }

    //
    // 🧠 PARSE OPENAI RESPONSE
    //
    const aiData = await aiResponse.json();
    const content: string = aiData.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("JSON Parse Error:", err, content);
      return NextResponse.json(
        { error: "Invalid AI JSON format" },
        { status: 500 }
      );
    }

    //
    // RETURN TO FRONTEND
    //
    return NextResponse.json(parsed);

  } catch (err: any) {
    console.error("Analyze Deal Error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
