export type ConfidenceLevel = 'A' | 'B' | 'C';

export type AIConfidence = {
  level?: ConfidenceLevel | null;
  icon?: '⚠️' | '◑' | '●' | null;
  summary?: string | null; // one-line reason
  signals?: Array<{ label: string; value: string }> | null;
  source?: string | null;
  updated_at?: string | null;
} | null;

export type ConfidenceSignal = { label: string; value: string };

export type MetricRow = {
  year: string;
  value: number | null;
  unit?: string | null;
  note?: string | null;
};

export type MarginRow = {
  type?: string | null;
  year: string;
  value_pct: number | null;
  note?: string | null;
};

export type ChatMsg = { role: "user" | "assistant" | "system"; content: string; ts?: number };
export type PromptKind = "core" | "followup";
