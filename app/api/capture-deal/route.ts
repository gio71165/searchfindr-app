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
    // DEBUG (remove after deploy succeeds)
    return NextResponse.json(
      { ok: true, version: "vTEST-123" },
      { status: 200, headers: corsHeaders }
    );

    // 1) Read API key
    // const apiKey = req.headers.get("x-searchfindr-key");
    // if (!apiKey) {
    //   return NextResponse.json(
    //     { error: "Missing X-Searchfindr-Key header." },
    //     { status: 401, headers: corsHeaders }
    //   );
    // }

    // (We’ll re-enable the full logic after we confirm build passes.)
  } catch (err: any) {
    console.error("capture-deal error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
