// app/api/on-market/dev-feed/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET() {
  const now = new Date().toUTCString();

  // These can be ANY URLs for testing. Ideally point to pages you control.
  // For now we’ll use example.com with unique paths.
  const items = Array.from({ length: 25 }).map((_, i) => {
    const link = `http://localhost:3000/api/on-market/dev-detail?id=${i + 1}`;
    const title = `Test Deal ${i + 1}`;
    return `
      <item>
        <title>${xmlEscape(title)}</title>
        <link>${xmlEscape(link)}</link>
        <pubDate>${now}</pubDate>
        <description>${xmlEscape("Dev feed item for pipeline testing.")}</description>
      </item>
    `;
  });

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>SearchFindr Dev On-Market Feed</title>
      <link>http://localhost:3000/api/on-market/dev-feed</link>
      <description>Dev feed for validating ingestion pipeline</description>
      <lastBuildDate>${now}</lastBuildDate>
      ${items.join("\n")}
    </channel>
  </rss>`;

  return new NextResponse(rss, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
