// app/api/process-financials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

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
  if (typeof v !== "string") return "Operational Performance: Unknown | Financial Controls: Unknown";
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
  if (label.toLowerCase().includes("weak") || label.toLowerCase().includes("low")) level = "Low";
  if (label.toLowerCase().includes("strong") || label.toLowerCase().includes("high")) level = "High";

  return {
    level,
    label,
    bullets,
    source: "financial_analysis",
    updated_at: new Date().toISOString(),
  };
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

  if (!res.ok) throw new Error("OpenAI file upload failed");
  const json = await res.json();
  return json.id as string;
}

function extractTextFromOutput(output: any[]): string | null {
  for (const item of output ?? []) {
    for (const block of item?.content ?? []) {
      if (typeof block?.text === "string") return block.text;
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

  const system = `
You are a skeptical financial screening analyst for SMB acquisitions.
Return STRICT JSON only. No markdown. No commentary.
Never invent numbers. If uncertain, say so.

overall_confidence MUST be a dual-axis label, for example:
"Operational Performance: Mixed | Financial Controls: Weak"
`;

  const schema = `
{
  "overall_confidence": string,
  "extracted_metrics": {
    "revenue": [{"year": string, "value": number|null, "unit": string, "note": string}],
    "ebitda": [{"year": string, "value": number|null, "unit": string, "note": string}],
    "net_income": [{"year": string, "value": number|null, "unit": string, "note": string}],
    "margins": [{"type": string, "year": string, "value_pct": number|null, "note": string}],
    "yoy_trends": [string]
  },
  "red_flags": [string],
  "green_flags": [string],
  "missing_items": [string],
  "diligence_notes": [string]
}
`;

  const input: any[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: [{ type: "input_text", text: `Analyze these financials.\n${schema}` }],
    },
  ];

  if (args.extractedText) {
    input.push({
      role: "user",
      content: [{ type: "input_text", text: args.extractedText }],
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

  if (!res.ok) throw new Error("OpenAI response failed");
  const json = await res.json();

  const text =
    json.output_text ||
    (Array.isArray(json.output) ? extractTextFromOutput(json.output) : null);

  if (!text) throw new Error("No usable model output");

  const parsed = JSON.parse(text);

  return {
    overall_confidence: clampConfidenceLabel(parsed.overall_confidence),
    extracted_metrics: parsed.extracted_metrics ?? {},
    red_flags: clampStringArray(parsed.red_flags),
    green_flags: clampStringArray(parsed.green_flags),
    missing_items: clampStringArray(parsed.missing_items),
    diligence_notes: clampStringArray(parsed.diligence_notes),
  };
}

/* ───────────────────────── MAIN ───────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { data: userData } = await supabaseUser.auth.getUser(jwt);
    const userId = userData?.user?.id;
    if (!userId) return NextResponse.json({ error: "Invalid auth" }, { status: 401 });

    const body = await req.json();
    const dealId = body?.deal_id;
    if (!dealId) return NextResponse.json({ error: "Missing deal_id" }, { status: 400 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("workspace_id")
      .eq("id", userId)
      .single();

    const workspaceId = profile?.workspace_id;
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, workspace_id, source_type, financials_storage_path, financials_filename, financials_mime")
      .eq("id", dealId)
      .single();

    if (!company || company.workspace_id !== workspaceId)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    if (company.source_type !== "financials")
      return NextResponse.json({ error: "Not a financials deal" }, { status: 400 });

    const { data: file } = await supabaseAdmin.storage
      .from("financials")
      .download(company.financials_storage_path);

    const bytes = await file.arrayBuffer();
    let extractedText: string | undefined;
    let openaiFileId: string | undefined;

    if (isXlsx(company.financials_mime, company.financials_filename))
      extractedText = xlsxToCsvText(bytes);
    else if (isCsv(company.financials_mime, company.financials_filename))
      extractedText = new TextDecoder().decode(bytes);
    else if (isPdf(company.financials_mime, company.financials_filename))
      openaiFileId = await uploadToOpenAI(bytes, company.financials_filename);

    const analysis = await callOpenAIJson({
      filename: company.financials_filename,
      mime: company.financials_mime,
      extractedText,
      openaiFileId,
    });

    // 🔹 INSERT (history preserved)
    await supabaseAdmin.from("financial_analyses").insert({
      user_id: userId,
      workspace_id: workspaceId,
      deal_id: dealId,
      source_filename: company.financials_filename,
      overall_confidence: analysis.overall_confidence,
      extracted_metrics: analysis.extracted_metrics,
      red_flags: analysis.red_flags,
      green_flags: analysis.green_flags,
      missing_items: analysis.missing_items,
      diligence_notes: analysis.diligence_notes,
    });

    // 🔹 UPDATE company confidence (dashboard + deal pages use this)
    const confidenceJson = buildConfidenceJson(analysis.overall_confidence);

    await supabaseAdmin
      .from("companies")
      .update({ ai_confidence_json: confidenceJson })
      .eq("id", dealId);

    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("process-financials error:", err);
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
