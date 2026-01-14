// app/api/process-financials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest, AuthError } from "@/lib/api/auth";
import { DealsRepository } from "@/lib/data-access/deals";
import { NotFoundError } from "@/lib/data-access/base";
import * as XLSX from "xlsx";
import { FINANCIALS_SYSTEM_PROMPT, buildFinancialsUserMessage } from "@/lib/prompts/financials-analysis";
import { getBenchmarkForDeal } from "@/lib/data/industry-benchmarks";

export const runtime = "nodejs";

/* ───────────────────────── ENV ───────────────────────── */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/* ───────────────────────── CORS ───────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/* ───────────────────────── HELPERS ───────────────────────── */

function clampStringArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function clampConfidenceLabel(v: any): string {
  if (typeof v !== "string")
    return "Operational Performance: Unknown | Financial Controls: Unknown";
  return v.trim().slice(0, 140);
}

/**
 * Convert the model confidence string into structured JSON
 * Example input:
 * "Operational Performance: Mixed | Financial Controls: Weak"
 */
function buildConfidenceJson(label: string) {
  const bullets: string[] = [];

  const parts = label.split("|").map((p) => p.trim());
  for (const p of parts) {
    if (p) bullets.push(p);
  }

  // Pick a conservative top-level level
  let level: "High" | "Medium" | "Low" = "Medium";
  const lower = label.toLowerCase();
  if (lower.includes("weak") || lower.includes("low")) level = "Low";
  if (lower.includes("strong") || lower.includes("high")) level = "High";

  return {
    level,
    label,
    bullets,
    source: "financial_analysis",
    updated_at: new Date().toISOString(),
  };
}

function firstSentence(text: string | null | undefined): string {
  const t = (text || "").trim();
  if (!t) return "";
  const idx = t.search(/[.!?]\s/);
  if (idx === -1) return t.slice(0, 220);
  return t.slice(0, idx + 1).trim();
}

function isPdf(mime: string, filename: string) {
  return mime === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
}
function isCsv(mime: string, filename: string) {
  return (
    mime === "text/csv" ||
    mime === "application/csv" ||
    mime === "text/plain" ||
    filename.toLowerCase().endsWith(".csv")
  );
}
function isXlsx(mime: string, filename: string) {
  const lower = filename.toLowerCase();
  return (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls")
  );
}

function xlsxToCsvText(buffer: ArrayBuffer): string {
  const wb = XLSX.read(buffer, { type: "array" });
  const chunks: string[] = [];

  for (const sheetName of wb.SheetNames.slice(0, 6)) {
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws);
    if (csv?.trim()) chunks.push(`### SHEET: ${sheetName}\n${csv.trim()}`);
  }

  return chunks.join("\n\n") || "No readable sheets found.";
}

async function uploadToOpenAI(bytes: ArrayBuffer, filename: string) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  const form = new FormData();
  form.append("purpose", "assistants");
  form.append("file", new Blob([bytes]), filename);

  const res = await fetch(`${OPENAI_BASE_URL}/v1/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });

  const raw = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`OpenAI file upload failed${raw ? `: ${raw}` : ""}`);

  const json = raw ? JSON.parse(raw) : null;
  if (!json?.id) throw new Error("OpenAI file upload returned no id");
  return json.id as string;
}

function extractTextFromOutput(output: any[]): string | null {
  for (const item of output ?? []) {
    for (const block of item?.content ?? []) {
      // Some responses payloads shape text as { type:'output_text', text:'...' } or block.text
      if (typeof block?.text === "string") return block.text;
      if (typeof block?.text?.value === "string") return block.text.value;
    }
  }
  return null;
}

/* ───────────────────────── OPENAI ───────────────────────── */

async function callOpenAIJson(args: {
  filename: string;
  mime: string;
  extractedText?: string;
  openaiFileId?: string;
}) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  const system = FINANCIALS_SYSTEM_PROMPT.template;
  const userMessage = buildFinancialsUserMessage();

  const input: any[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: [{ type: "input_text", text: userMessage }],
    },
  ];

  if (args.extractedText) {
    input.push({
      role: "user",
      content: [{ type: "input_text", text: args.extractedText.slice(0, 18000) }],
    });
  }

  if (args.openaiFileId) {
    input.push({
      role: "user",
      content: [
        { type: "input_text", text: "The financials are in the attached file." },
        { type: "input_file", file_id: args.openaiFileId },
      ],
    });
  }

  const res = await fetch(`${OPENAI_BASE_URL}/v1/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input,
      temperature: 0.2,
      text: { format: { type: "json_object" } },
    }),
  });

  const raw = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`OpenAI response failed${raw ? `: ${raw}` : ""}`);

  const json = raw ? JSON.parse(raw) : null;

  const text =
    json?.output_text ||
    (Array.isArray(json?.output) ? extractTextFromOutput(json.output) : null);

  if (!text) throw new Error("No usable model output");

  const parsed = JSON.parse(text);

  // Validate and clamp QoE red flags
  const qoeRedFlags = Array.isArray(parsed.qoe_red_flags)
    ? parsed.qoe_red_flags
        .filter((flag: any) => flag && typeof flag === "object")
        .map((flag: any) => ({
          type:
            typeof flag.type === "string"
              ? flag.type
              : "unknown",
          severity:
            typeof flag.severity === "string" && ["low", "medium", "high"].includes(flag.severity.toLowerCase())
              ? flag.severity.toLowerCase()
              : "medium",
          description: typeof flag.description === "string" ? flag.description.slice(0, 500) : "",
        }))
        .filter((flag: any) => flag.type !== "unknown" && flag.description)
        .slice(0, 20)
    : [];

  return {
    overall_confidence: clampConfidenceLabel(parsed.overall_confidence),
    extracted_metrics: parsed.extracted_metrics ?? {},
    red_flags: clampStringArray(parsed.red_flags),
    green_flags: clampStringArray(parsed.green_flags),
    missing_items: clampStringArray(parsed.missing_items),
    diligence_notes: clampStringArray(parsed.diligence_notes),
    qoe_red_flags: qoeRedFlags,
  };
}

/* ───────────────────────── MAIN ───────────────────────── */

export async function POST(req: NextRequest) {
  try {
    // Env sanity (prevents weird Vercel runtime confusion)
    if (!SUPABASE_URL) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500, headers: corsHeaders }
      );
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500, headers: corsHeaders }
      );
    }
    if (!SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY" },
        { status: 500, headers: corsHeaders }
      );
    }
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500, headers: corsHeaders }
      );
    }

    const { user, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabaseAdmin, workspace.id);

    const body = await req.json().catch(() => null);
    const dealId = body?.deal_id;
    if (!dealId) {
      return NextResponse.json({ error: "Missing deal_id" }, { status: 400, headers: corsHeaders });
    }

    // Company
    let company;
    try {
      company = await deals.getById(dealId);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return NextResponse.json({ error: "Deal not found" }, { status: 404, headers: corsHeaders });
      }
      throw err;
    }

    if (company.source_type !== "financials") {
      return NextResponse.json({ error: "Not a financials deal" }, { status: 400, headers: corsHeaders });
    }

    if (!company.financials_storage_path) {
      return NextResponse.json({ error: "Missing financials_storage_path" }, { status: 400, headers: corsHeaders });
    }

    // Download
    const filename = company.financials_filename || "financials";
    const mime = company.financials_mime || "";

    const { data: file, error: dlErr } = await supabaseAdmin.storage
      .from("financials")
      .download(company.financials_storage_path);

    if (dlErr) {
      console.error("financials download error:", dlErr);
      return NextResponse.json({ error: "Failed to download financials file." }, { status: 500, headers: corsHeaders });
    }

    if (!file) {
      return NextResponse.json(
        { error: "Financials file missing (download returned null)." },
        { status: 500, headers: corsHeaders }
      );
    }

    const bytes = await file.arrayBuffer();

    // Extract / attach
    let extractedText: string | undefined;
    let openaiFileId: string | undefined;

    if (isXlsx(mime, filename)) extractedText = xlsxToCsvText(bytes);
    else if (isCsv(mime, filename)) extractedText = new TextDecoder().decode(bytes).slice(0, 18000);
    else if (isPdf(mime, filename)) openaiFileId = await uploadToOpenAI(bytes, filename);
    else {
      const decoded = new TextDecoder().decode(bytes);
      if (decoded?.trim()) extractedText = decoded.slice(0, 18000);
      else openaiFileId = await uploadToOpenAI(bytes, filename);
    }

    // AI
    const analysis = await callOpenAIJson({
      filename,
      mime,
      extractedText,
      openaiFileId,
    });

    const confidenceJson = buildConfidenceJson(analysis.overall_confidence);

    // Extract revenue and EBITDA for benchmark comparison
    const revenue = analysis.extracted_metrics?.revenue?.[0]?.value ?? null;
    const ebitda = analysis.extracted_metrics?.ebitda?.[0]?.value ?? null;
    const industry = company.industry ?? null;

    // Get industry benchmark comparison
    const benchmarkComparison = getBenchmarkForDeal(industry, revenue, ebitda);

    // Generate owner interview questions based on red flags and missing items
    const ownerInterviewQuestions: Array<{ category: string; question: string }> = [];
    
    // Questions from QoE red flags
    if (Array.isArray(analysis.qoe_red_flags)) {
      for (const flag of analysis.qoe_red_flags.slice(0, 5)) {
        if (flag.type === "customer_concentration") {
          ownerInterviewQuestions.push({
            category: "Customers",
            question: flag.description.includes("%")
              ? flag.description
              : `Customer concentration concern: ${flag.description} - What are the contract terms and renewal likelihood for your top customers?`,
          });
        } else if (flag.type === "revenue_spike" || flag.type === "revenue_drop") {
          ownerInterviewQuestions.push({
            category: "Revenue",
            question: flag.description.includes("?")
              ? flag.description
              : `${flag.description} - What caused this and is it sustainable?`,
          });
        } else if (flag.type === "addbacks") {
          ownerInterviewQuestions.push({
            category: "Financials",
            question: flag.description.includes("?")
              ? flag.description
              : `${flag.description} - Can you provide detail on each addback item?`,
          });
        } else if (flag.type === "working_capital") {
          ownerInterviewQuestions.push({
            category: "Financials",
            question: flag.description.includes("?")
              ? flag.description
              : `${flag.description} - What's driving the working capital trend?`,
          });
        }
      }
    }

    // Questions from general red flags
    for (const redFlag of analysis.red_flags.slice(0, 3)) {
      if (redFlag.toLowerCase().includes("customer") || redFlag.toLowerCase().includes("concentration")) {
        ownerInterviewQuestions.push({
          category: "Customers",
          question: `Regarding ${redFlag} - What are the contract terms and renewal process?`,
        });
      } else if (redFlag.toLowerCase().includes("revenue") || redFlag.toLowerCase().includes("sales")) {
        ownerInterviewQuestions.push({
          category: "Revenue",
          question: `Regarding ${redFlag} - Can you explain the underlying drivers?`,
        });
      } else {
        ownerInterviewQuestions.push({
          category: "Operations",
          question: `Regarding ${redFlag} - What should a buyer verify?`,
        });
      }
    }

    // Questions from missing items
    for (const missing of analysis.missing_items.slice(0, 2)) {
      ownerInterviewQuestions.push({
        category: "Financials",
        question: `Missing information: ${missing} - Can you provide this data?`,
      });
    }

    // Limit to 8-10 questions total
    const finalQuestions = ownerInterviewQuestions.slice(0, 10);

    // Build enhanced financials JSON with new fields
    const enhancedFinancialsJson = {
      ...analysis.extracted_metrics,
      qoe_red_flags: analysis.qoe_red_flags ?? [],
      industry_benchmark: benchmarkComparison,
      owner_interview_questions: finalQuestions,
    };

    // ✅ financial_analyses has UNIQUE(deal_id) -> use UPSERT (latest-only)
    // NOTE: If your table does NOT have confidence_json column, remove that field below.
    const { error: upsertErr } = await supabaseAdmin
      .from("financial_analyses")
      .upsert(
        {
          user_id: user.id,
          workspace_id: workspace.id,
          deal_id: dealId,
          source_filename: filename,
          overall_confidence: analysis.overall_confidence,
          extracted_metrics: analysis.extracted_metrics,
          red_flags: analysis.red_flags,
          green_flags: analysis.green_flags,
          missing_items: analysis.missing_items,
          diligence_notes: analysis.diligence_notes,
          confidence_json: confidenceJson,
        },
        { onConflict: "deal_id" }
      );

    if (upsertErr) {
      console.error("financial_analyses upsert error:", upsertErr);
      return NextResponse.json({ error: "Failed to save financial analysis." }, { status: 500, headers: corsHeaders });
    }

    // ✅ Update company confidence AND make "Why it matters" update (ai_summary)
    // Also store enhanced financials JSON with QoE red flags, benchmarks, and questions
    const whyItMatters =
      firstSentence((analysis?.diligence_notes?.[0] as any) || "") ||
      firstSentence((analysis?.red_flags?.[0] as any) || "") ||
      "Financial analysis completed — review red flags, missing items, and trends.";

    try {
      await deals.updateAnalysis(dealId, {
        ai_confidence_json: confidenceJson,
        ai_summary: whyItMatters,
        ai_financials_json: enhancedFinancialsJson,
      });
    } catch (err) {
      console.error("companies update ai_confidence_json/ai_summary/ai_financials_json error:", err);
      return NextResponse.json({ error: "Failed to update company data." }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode, headers: corsHeaders });
    }
    console.error("process-financials error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
