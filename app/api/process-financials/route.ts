// app/api/process-financials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * We intentionally do NOT use a simple High/Medium/Low enum anymore.
 * We return a richer, sophisticated label string like:
 * "Data Consistency: High | Reporting Quality: Medium"
 * or
 * "Operational Performance: Strong | Financial Controls: Weak"
 */
function clampConfidenceLabel(v: any): string {
  if (typeof v !== "string") return "Data Consistency: Low | Reporting Quality: Low";
  const s = v.trim();
  if (!s) return "Data Consistency: Low | Reporting Quality: Low";
  return s.slice(0, 120);
}

function clampStringArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
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
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ",", RS: "\n" });
    const trimmed = (csv ?? "").trim();
    if (trimmed) chunks.push(`### SHEET: ${sheetName}\n${trimmed}`);
  }

  const out = chunks.join("\n\n").trim();
  return out || "No readable sheets found.";
}

async function uploadToOpenAI(fileBytes: ArrayBuffer, filename: string) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  const form = new FormData();
  form.append("purpose", "assistants");
  form.append("file", new Blob([fileBytes]), filename);

  const res = await fetch(`${OPENAI_BASE_URL}/v1/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI file upload failed: ${t}`);
  }

  const json = await res.json();
  return json.id as string;
}

function extractTextFromOutput(output: any[]): string | null {
  try {
    for (const item of output) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;

      for (const block of content) {
        if (block?.type === "output_text" && typeof block?.text === "string") return block.text;
        if (block?.type === "text" && typeof block?.text === "string") return block.text;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function callOpenAIJson(args: {
  filename: string;
  mime: string;
  extractedText?: string; // for csv/xlsx
  openaiFileId?: string; // for pdf
}) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  const system = `You are a financial screening analyst for SMB acquisitions.
Return STRICT JSON only. No markdown. No commentary.
If something isn't present, list it under missing_items.
Never invent numbers. If you estimate, label as estimate and explain why.

IMPORTANT: "overall_confidence" must NOT be a single High/Medium/Low.
Use a dual-axis label so sophisticated users do not misinterpret it.
Preferred format:
"Data Consistency: High|Medium|Low | Reporting Quality: High|Medium|Low"
If you can clearly distinguish operations vs controls, you may instead use:
"Operational Performance: Strong|Mixed|Weak | Financial Controls: Strong|Mixed|Weak"
Keep it short.`;

  const schemaHint = `Return JSON with this exact shape:
{
  "overall_confidence": "Data Consistency: High|Medium|Low | Reporting Quality: High|Medium|Low" 
    OR "Operational Performance: Strong|Mixed|Weak | Financial Controls: Strong|Mixed|Weak",
  "extracted_metrics": {
    "revenue": [{"year": "YYYY or label", "value": number|null, "unit": "USD|unknown", "note": string}],
    "ebitda": [{"year": "YYYY or label", "value": number|null, "unit": "USD|unknown", "note": string}],
    "net_income": [{"year": "YYYY or label", "value": number|null, "unit": "USD|unknown", "note": string}],
    "margins": [{"type":"EBITDA Margin|Net Margin|Gross Margin|unknown","year":"YYYY or label","value_pct": number|null,"note": string}],
    "yoy_trends": [string]
  },
  "red_flags": [string],
  "green_flags": [string],
  "missing_items": [string],
  "diligence_notes": [string]
}`;

  const inputParts: any[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: `Analyze these financials for deal screening.
Filename: ${args.filename}
MIME: ${args.mime}

${schemaHint}`,
        },
      ],
    },
  ];

  if (args.extractedText) {
    inputParts.push({
      role: "user",
      content: [{ type: "input_text", text: `Extracted table/text content:\n\n${args.extractedText}` }],
    });
  }

  if (args.openaiFileId) {
    inputParts.push({
      role: "user",
      content: [
        { type: "input_text", text: "The financials are in the attached file. Extract what you can." },
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
      input: inputParts,
      text: { format: { type: "json_object" } },
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI responses failed: ${t}`);
  }

  const json = await res.json();

  const outText =
    (typeof json.output_text === "string" && json.output_text) ||
    (Array.isArray(json.output) ? extractTextFromOutput(json.output) : null);

  if (!outText) throw new Error("No usable text output from OpenAI.");

  let parsed: any;
  try {
    parsed = JSON.parse(outText);
  } catch {
    throw new Error("Model did not return valid JSON.");
  }

  return {
    overall_confidence: clampConfidenceLabel(parsed.overall_confidence),
    extracted_metrics: parsed.extracted_metrics ?? {},
    red_flags: clampStringArray(parsed.red_flags),
    green_flags: clampStringArray(parsed.green_flags),
    missing_items: clampStringArray(parsed.missing_items),
    diligence_notes: clampStringArray(parsed.diligence_notes),
  };
}

async function downloadFromFinancialsBucket(storagePath: string): Promise<ArrayBuffer> {
  const { data, error } = await supabaseAdmin.storage.from("financials").download(storagePath);
  if (error || !data) throw new Error(error?.message || "Failed to download financials file.");

  // supabase-js returns a Blob in node runtime too
  // @ts-ignore
  const ab = await data.arrayBuffer();
  return ab as ArrayBuffer;
}

export async function POST(req: NextRequest) {
  try {
    // 1) Auth
    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!jwt) {
      return NextResponse.json(
        { error: "Missing Authorization bearer token." },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseUserClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid auth." }, { status: 401, headers: corsHeaders });
    }

    const userId = userData.user.id;

    // 2) Body JSON: { deal_id }
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: corsHeaders });
    }

    const dealId = typeof body?.deal_id === "string" ? body.deal_id : null;
    if (!dealId) {
      return NextResponse.json({ error: "Missing deal_id." }, { status: 400, headers: corsHeaders });
    }

    // 3) Determine user's workspace_id (profile) for access check
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("workspace_id")
      .eq("id", userId)
      .single();

    if (profileErr || !profile?.workspace_id) {
      return NextResponse.json({ error: "Missing workspace for user." }, { status: 403, headers: corsHeaders });
    }

    const workspaceId = profile.workspace_id as string;

    // 4) Load the company/deal row + validate access
    const { data: company, error: companyErr } = await supabaseAdmin
      .from("companies")
      .select(
        "id, workspace_id, user_id, source_type, company_name, financials_storage_path, financials_filename, financials_mime"
      )
      .eq("id", dealId)
      .single();

    if (companyErr || !company) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404, headers: corsHeaders });
    }

    if (company.workspace_id !== workspaceId) {
      return NextResponse.json(
        { error: "You do not have access to this deal." },
        { status: 403, headers: corsHeaders }
      );
    }

    if (company.source_type !== "financials") {
      return NextResponse.json(
        { error: "This deal is not a Financials deal." },
        { status: 400, headers: corsHeaders }
      );
    }

    const storagePath = company.financials_storage_path as string | null;
    if (!storagePath) {
      return NextResponse.json(
        { error: "No financials file found for this deal. Re-upload the financials." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 5) Fetch file bytes from Storage
    const filename = (company.financials_filename as string | null) || "financials";
    const mime = (company.financials_mime as string | null) || "application/octet-stream";

    const bytes = await downloadFromFinancialsBucket(storagePath);

    // 6) Prepare model inputs
    let extractedText: string | undefined;
    let openaiFileId: string | undefined;

    if (isXlsx(mime, filename)) {
      extractedText = xlsxToCsvText(bytes);
    } else if (isCsv(mime, filename)) {
      extractedText = new TextDecoder("utf-8").decode(bytes).slice(0, 250_000);
    } else if (isPdf(mime, filename)) {
      openaiFileId = await uploadToOpenAI(bytes, filename);
    } else {
      extractedText = new TextDecoder("utf-8").decode(bytes).slice(0, 250_000);
    }

    // 7) Run analysis
    const analysis = await callOpenAIJson({
      filename,
      mime,
      extractedText,
      openaiFileId,
    });

    // 8) Upsert analysis (overwrite on rerun)
    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("financial_analyses")
      .upsert(
        {
          user_id: userId,
          workspace_id: workspaceId,
          deal_id: dealId,
          source_filename: filename,
          overall_confidence: analysis.overall_confidence,
          extracted_metrics: analysis.extracted_metrics,
          red_flags: analysis.red_flags,
          green_flags: analysis.green_flags,
          missing_items: analysis.missing_items,
          diligence_notes: analysis.diligence_notes,
        },
        { onConflict: "deal_id" }
      )
      .select("*")
      .single();

    if (saveErr) {
      console.error("financial_analyses upsert error:", saveErr);
      throw saveErr;
    }

    return NextResponse.json({ ok: true, analysis: saved }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("process-financials error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
