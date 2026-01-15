import OpenAI from "openai";
import { DEAL_CHAT_SYSTEM_PROMPT, buildDealChatContextBlock } from "@/lib/prompts/deal-chat";
import { withRetry } from "@/lib/utils/retry";

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
  const systemPrompt = DEAL_CHAT_SYSTEM_PROMPT.template;

  const contextBlock = buildDealChatContextBlock(dealContext, {
    clipText,
    safeJsonStringify,
  });

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const cleanedHistory = cleanHistory(args.history, 10);

  const messages: Array<{ role: ChatRole; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "system", content: contextBlock },
    ...cleanedHistory,
    { role: "user", content: userMessage },
  ];

  try {
    const resp = await withRetry(
      () =>
        client.chat.completions.create({
          model,
          messages,
          temperature: 0.2,
          // Keeping this modest helps avoid runaway output on noisy contexts
          max_tokens: 700,
        }),
      { maxRetries: 2, delayMs: 1000 }
    );

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
