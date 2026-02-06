import { NextResponse } from 'next/server';

// Request body size limit — prevents DoS via large payloads
// File uploads (CIM/financials) use up to 25MB; allow 30MB
const MAX_BODY_BYTES = 30 * 1024 * 1024; // 30MB

export function middleware(req: Request) {
  const method = req.method;
  const url = req.url;

  // Only check body size for mutating API routes
  if (
    (method === 'POST' || method === 'PUT' || method === 'PATCH') &&
    url.includes('/api/')
  ) {
    const contentLength = req.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!Number.isNaN(size) && size > MAX_BODY_BYTES) {
        return new Response(
          JSON.stringify({ error: 'Request body too large' }),
          { status: 413, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
