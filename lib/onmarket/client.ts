// lib/onmarket/client.ts

export type V1IndustryTag = "HVAC" | "Plumbing" | "Electrical" | "Landscaping" | "Pest Control" | "Commercial Cleaning" | "Auto Repair" | "Home Health" | "IT Services" | "Staffing";

export type OnMarketDeal = {
  id: string;
  company_name: string | null;
  headline: string;

  industry_tag: V1IndustryTag | null;
  industry_confidence: number;

  location_city: string | null;
  location_state: string | null;

  revenue_min: number | null;
  revenue_max: number | null;
  ebitda_min: number | null;
  ebitda_max: number | null;

  revenue_band: string | null;
  ebitda_band: string | null;

  asking_price: number | null;
  deal_type: "asset" | "stock" | "unknown";

  has_teaser_pdf: boolean;

  source_name: string;
  source_url: string;

  data_confidence: "A" | "B" | "C";
  confidence_score: number; // Deprecated: kept for backward compatibility

  first_seen_at: string;
  last_seen_at: string;

  published_at: string | null;
  is_new_today: boolean;
  promoted_date: string | null;
};

export type OnMarketSearchParams = {
  industries?: V1IndustryTag[];
  state?: string;
  revenue_band?: string;
  ebitda_band?: string;
  include_unknown_financials?: boolean;
  include_unknown_location?: boolean;
  sort?: "freshness" | "confidence";
  limit?: number;
  offset?: number;
};

export type SavedDealRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  status: "saved" | "pipeline" | "passed";
  created_at: string;
  updated_at: string;
  on_market_deal: OnMarketDeal;
};

export type DealNote = {
  id: string;
  workspace_saved_deal_id: string;
  note: string;
  created_at: string;
};

const V1_ALLOWED: readonly V1IndustryTag[] = ["HVAC", "Plumbing", "Electrical", "Landscaping", "Pest Control", "Commercial Cleaning", "Auto Repair", "Home Health", "IT Services", "Staffing"] as const;

function sanitizeIndustries(input?: string[]): V1IndustryTag[] | undefined {
  if (!input?.length) return undefined;
  const cleaned = input.filter((x): x is V1IndustryTag => V1_ALLOWED.includes(x as V1IndustryTag));
  return cleaned.length ? cleaned : [];
}

function buildQuery(params: OnMarketSearchParams): string {
  const sp = new URLSearchParams();

  if (params.industries?.length) {
    for (const ind of params.industries) sp.append("industry", ind);
  }

  if (params.state) sp.set("state", params.state);
  if (params.revenue_band) sp.set("revenue_band", params.revenue_band);
  if (params.ebitda_band) sp.set("ebitda_band", params.ebitda_band);

  if (typeof params.include_unknown_financials === "boolean") {
    sp.set("include_unknown_financials", params.include_unknown_financials ? "true" : "false");
  }
  if (typeof params.include_unknown_location === "boolean") {
    sp.set("include_unknown_location", params.include_unknown_location ? "true" : "false");
  }

  if (params.sort) sp.set("sort", params.sort);
  if (typeof params.limit === "number") sp.set("limit", String(params.limit));
  if (typeof params.offset === "number") sp.set("offset", String(params.offset));

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 400)}`);
  }
}

/**
 * Global inventory search (promoted deals).
 */
export async function searchOnMarket(params: OnMarketSearchParams) {
  // Optional extra guard: if someone passes bad industries, sanitize
  const sanitized = sanitizeIndustries(params.industries as unknown as string[] | undefined);
  const qs = buildQuery({ ...params, industries: sanitized as any });

  const res = await fetch(`/api/on-market/search${qs}`, {
    method: "GET",
    cache: "no-store",
  });

  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.error ?? "Search failed");
  return data as { ok: true; limit: number; offset: number; count: number; deals: OnMarketDeal[] };
}

export async function saveOnMarketDeal(args: {
  accessToken: string;
  workspace_id: string;
  on_market_deal_id: string;
  status?: "saved" | "pipeline" | "passed";
}) {
  const res = await fetch("/api/on-market/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.accessToken}`,
    },
    body: JSON.stringify({
      workspace_id: args.workspace_id,
      on_market_deal_id: args.on_market_deal_id,
      status: args.status ?? "saved",
    }),
  });

  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.error ?? "Save failed");
  return data as { ok: true; saved: any };
}

export async function getSavedOnMarketDeals(args: {
  accessToken: string;
  workspace_id: string;
  status?: "saved" | "pipeline" | "passed";
  limit?: number;
}) {
  const sp = new URLSearchParams();
  sp.set("workspace_id", args.workspace_id);
  if (args.status) sp.set("status", args.status);
  if (typeof args.limit === "number") sp.set("limit", String(args.limit));

  const res = await fetch(`/api/on-market/saved?${sp.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
    },
    cache: "no-store",
  });

  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.error ?? "Fetch saved deals failed");
  return data as { ok: true; workspace_id: string; count: number; saved: SavedDealRow[] };
}

export async function getOnMarketNotes(args: { accessToken: string; workspace_saved_deal_id: string }) {
  const sp = new URLSearchParams();
  sp.set("workspace_saved_deal_id", args.workspace_saved_deal_id);

  const res = await fetch(`/api/on-market/notes?${sp.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${args.accessToken}` },
    cache: "no-store",
  });

  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.error ?? "Fetch notes failed");
  return data as { ok: true; workspace_saved_deal_id: string; count: number; notes: DealNote[] };
}

export async function addOnMarketNote(args: { accessToken: string; workspace_saved_deal_id: string; note: string }) {
  const res = await fetch("/api/on-market/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.accessToken}`,
    },
    body: JSON.stringify({
      workspace_saved_deal_id: args.workspace_saved_deal_id,
      note: args.note,
    }),
  });

  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.error ?? "Add note failed");
  return data as { ok: true; note: DealNote };
}
