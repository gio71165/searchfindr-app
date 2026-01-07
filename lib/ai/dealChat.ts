import OpenAI from "openai";

export type ChatRole = "user" | "assistant" | "system";

export type DealChatArgs = {
  userMessage: string;
  dealContext: any;
  history?: Array<{ role: ChatRole; content: string }>;
};

export type DealChatResult = {
  answer: string;
  sources_used: string[];
  model?: string;
  tokens?: number;
  latency_ms?: number;
};

function safeJsonStringify(val: any, maxChars = 12000) {
  try {
    const s = JSON.stringify(val ?? null, null, 2);
    return s.length > maxChars ? s.slice(0, maxChars) + "\n...(clipped)" : s;
  } catch {
    const s = String(val ?? "");
    return s.length > maxChars ? s.slice(0, maxChars) + "\n...(clipped)" : s;
  }
}

function clipText(input: any, maxChars = 9000) {
  const str = typeof input === "string" ? input : String(input ?? "");
  return str.length > maxChars ? str.slice(0, maxChars) + "\n...(clipped)" : str;
}

function cleanHistory(history: DealChatArgs["history"], maxTurns = 10) {
  const allowed = new Set<ChatRole>(["user", "assistant", "system"]);
  return (history ?? [])
    .filter((m) => m && allowed.has(m.role))
    .slice(-maxTurns)
    .map((m) => ({
      role: m.role,
      content: String(m.content ?? "").slice(0, 4000),
    }));
}

export async function chatForDeal(args: DealChatArgs): Promise<DealChatResult> {
  const t0 = Date.now();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      answer: "Server misconfigured: OPENAI_API_KEY is missing.",
      sources_used: ["server_config"],
      latency_ms: Date.now() - t0,
    };
  }

  const client = new OpenAI({ apiKey });

  const userMessage = String(args.userMessage ?? "").trim();
  if (!userMessage) {
    return {
      answer: "Please enter a question.",
      sources_used: ["user_input"],
      latency_ms: Date.now() - t0,
    };
  }

  const dealContext = args.dealContext ?? {};
  const systemPrompt = `
You are SearchFindr's Deal Assistant.

You are STRICTLY deal-locked: only use the deal data provided in CONTEXT below.
If the user asks something that isn't supported by the context, say what is missing and what to request next (documents, fields, questions).

Be concise, practical, and specific. No fluff. No generic investing advice unless it directly applies to the provided deal.
When helpful, answer in bullets and include a short "Next checks" section.
`.trim();

  const contextBlock = `
CONTEXT (server truth; do not assume anything beyond this):
Company: ${dealContext?.company_name ?? "Unknown"}
Source type: ${dealContext?.source_type ?? "unknown"}
Listing URL: ${dealContext?.listing_url ?? "n/a"}

AI Summary:
${clipText(dealContext?.ai_summary, 5000)}

AI Red Flags:
${clipText(dealContext?.ai_red_flags, 5000)}

AI Scoring JSON:
${safeJsonStringify(dealContext?.ai_scoring_json, 8000)}

AI Financials JSON:
${safeJsonStringify(dealContext?.ai_financials_json, 9000)}

Criteria Match JSON:
${safeJsonStringify(dealContext?.criteria_match_json, 7000)}

AI Confidence JSON:
${safeJsonStringify(dealContext?.ai_confidence_json, 5000)}

Raw listing text (clipped):
${clipText(dealContext?.raw_listing_text, 9000)}
`.trim();

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const cleanedHistory = cleanHistory(args.history, 10);

  const messages: Array<{ role: ChatRole; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "system", content: contextBlock },
    ...cleanedHistory,
    { role: "user", content: userMessage },
  ];

  try {
    const resp = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
      // Keeping this modest helps avoid runaway output on noisy contexts
      max_tokens: 700,
    });

    const answer =
      resp.choices?.[0]?.message?.content?.trim() || "I couldn't generate an answer.";

    const tokens =
      (resp.usage?.prompt_tokens ?? 0) + (resp.usage?.completion_tokens ?? 0);

    const latency_ms = Date.now() - t0;

    const sources_used = [
      "companies.ai_summary",
      "companies.ai_red_flags",
      "companies.ai_scoring_json",
      "companies.ai_financials_json",
      "companies.criteria_match_json",
      "companies.ai_confidence_json",
      "companies.raw_listing_text",
      "companies.listing_url",
      "companies.cim_storage_path",
    ];

    return { answer, sources_used, model, tokens, latency_ms };
  } catch (e: any) {
    const latency_ms = Date.now() - t0;
    const detail = e?.message ? String(e.message) : String(e);

    return {
      answer: `Chat failed: ${detail}`,
      sources_used: ["openai_error"],
      model,
      latency_ms,
    };
  }
}
