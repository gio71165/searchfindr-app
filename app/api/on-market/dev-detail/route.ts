// app/api/on-market/dev-detail/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function htmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "0";
  const n = Number(id);

  // Deterministic-ish fake fields
  const states = ["TX", "FL", "CA", "NY", "NJ", "IL"];
  const industries = ["HVAC", "Plumbing", "Electrical", "Manufacturing", "Healthcare", "Landscaping"];
  const state = states[(n - 1) % states.length] ?? "TX";
  const industry = industries[(n - 1) % industries.length] ?? "HVAC";

  // Put some explicit numbers sometimes
  const revenue = n % 2 === 0 ? `$${(1.2 + (n % 7) * 0.5).toFixed(1)}M` : null;
  const ebitda = n % 3 === 0 ? `$${(250 + (n % 9) * 75)}k` : null;
  const asking = `$${(750 + (n % 10) * 125)}k`;

  const html = `
    <html>
      <head><title>Dev Deal ${htmlEscape(id)}</title></head>
      <body>
        <h1>Dev Deal ${htmlEscape(id)} — ${htmlEscape(industry)} Business</h1>
        <p><strong>Location:</strong> Austin, ${htmlEscape(state)}</p>
        <p><strong>Industry:</strong> ${htmlEscape(industry)}</p>
        <p><strong>Asking Price:</strong> ${htmlEscape(asking)}</p>
        ${revenue ? `<p><strong>Revenue:</strong> ${htmlEscape(revenue)}</p>` : `<p><strong>Revenue:</strong> Not disclosed</p>`}
        ${ebitda ? `<p><strong>EBITDA:</strong> ${htmlEscape(ebitda)}</p>` : `<p><strong>EBITDA:</strong> Not disclosed</p>`}
        <p>Deal type: asset sale</p>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
