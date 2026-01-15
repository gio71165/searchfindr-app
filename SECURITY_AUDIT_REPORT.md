# Security Audit Report - SearchFindr Application
**Date:** $(date)  
**Scope:** Full application security review

## Executive Summary

This audit identified **5 CRITICAL** security vulnerabilities and **4 HIGH** priority issues that require immediate attention. The application has good security practices in most areas (workspace isolation, input sanitization, file validation), but several endpoints lack proper authentication and authorization checks.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. **Unauthenticated API Endpoint - `/api/analyze-text`**
**Severity:** CRITICAL  
**Location:** `app/api/analyze-text/route.ts`

**Issue:**
- This endpoint has **NO authentication** whatsoever
- Anyone can call this endpoint and insert arbitrary data into the `companies` table
- Uses `DEFAULT_USER_ID` from environment, bypassing all user context
- No rate limiting
- No input validation beyond basic type checks

**Impact:**
- Unauthorized data insertion
- Database pollution
- Potential data exfiltration if combined with other vulnerabilities
- Cost abuse (OpenAI API calls)

**Recommendation:**
```typescript
// Add authentication at the start of POST handler
export async function POST(req: Request) {
  try {
    // ADD THIS:
    const { supabase, user, workspace } = await authenticateRequest(req);
    
    // Rest of the code...
    // Also change DEFAULT_USER_ID to user.id
    // Add workspace_id to insert
  }
}
```

---

### 2. **Unauthenticated Public Endpoint - `/api/on-market/search`**
**Severity:** CRITICAL  
**Location:** `app/api/on-market/search/route.ts`

**Issue:**
- Uses service role key but **NO user authentication**
- Anyone can query the entire on-market deals database
- No rate limiting
- Could be used for data scraping

**Impact:**
- Unauthorized access to deal inventory
- Potential data scraping
- Resource exhaustion (database queries)

**Recommendation:**
```typescript
export async function GET(req: NextRequest) {
  try {
    // ADD THIS:
    const { supabase, user, workspace } = await authenticateRequest(req);
    
    // Continue with existing logic but scope to workspace if needed
  }
}
```

**Note:** If this is intentionally public, add rate limiting and consider IP-based restrictions.

---

### 3. **Path Traversal Vulnerability in File Storage**
**Severity:** CRITICAL  
**Location:** 
- `app/api/process-cim/route.ts` (line 275, 297)
- `app/api/process-financials/route.ts` (line 350, 360)

**Issue:**
- `cimStoragePath` and `financials_storage_path` are used directly without validation
- No check for path traversal sequences (`../`, `..\\`, etc.)
- Could allow access to files outside intended directories

**Impact:**
- Unauthorized file access
- Potential data breach
- Access to other users' files

**Recommendation:**
```typescript
// Add path validation function
function validateStoragePath(path: string): boolean {
  // Reject path traversal attempts
  if (path.includes('..') || path.includes('//') || path.startsWith('/')) {
    return false;
  }
  // Ensure path matches expected pattern (e.g., UUID-based)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\/]+$/i;
  return uuidPattern.test(path);
}

// In process-cim/route.ts:
if (!validateStoragePath(cimStoragePath)) {
  return NextResponse.json({ success: false, error: 'Invalid storage path' }, { status: 400 });
}
```

---

### 4. **Server-Side Request Forgery (SSRF) Vulnerability**
**Severity:** CRITICAL  
**Location:** `app/api/off-market/search/route.ts` (line 176-197)

**Issue:**
- `fetchHomepageText()` function fetches arbitrary URLs from user input without validation
- No URL validation or allowlist
- Could be used to access internal services, cloud metadata endpoints, or other sensitive resources

**Impact:**
- Access to internal network resources
- Cloud metadata API access (AWS/GCP/Azure)
- Port scanning
- Data exfiltration

**Recommendation:**
```typescript
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Block private IP ranges
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false;
    }
    // Block private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname)) {
      return false;
    }
    // Block cloud metadata endpoints
    if (hostname.includes('metadata.google.internal') || 
        hostname.includes('169.254.169.254') ||
        hostname.includes('metadata.azure.com')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// In fetchHomepageText:
async function fetchHomepageText(urlStr: string) {
  if (!validateUrl(urlStr)) {
    return "";
  }
  // ... rest of function
}
```

---

### 5. **In-Memory Rate Limiting - Not Production Ready**
**Severity:** CRITICAL  
**Location:** `lib/api/rate-limit.ts`

**Issue:**
- Rate limiting uses in-memory Map storage
- Resets on server restart
- Doesn't work across multiple server instances (e.g., Vercel serverless)
- Attackers can bypass limits by hitting different instances

**Impact:**
- Rate limits can be bypassed
- Resource exhaustion attacks
- Cost abuse (OpenAI API calls)

**Recommendation:**
- Use Redis or database-backed rate limiting
- Consider using Vercel's rate limiting or a service like Upstash Redis
- Implement distributed rate limiting

```typescript
// Example with Upstash Redis (if using Vercel)
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  limit: number,
  windowSeconds: number = 3600
) {
  const key = `ratelimit:${userId}:${endpoint}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetAt: Date.now() + windowSeconds * 1000,
  };
}
```

---

## 🟠 HIGH PRIORITY ISSUES

### 6. **Missing Input Length Validation**
**Severity:** HIGH  
**Location:** Multiple endpoints

**Issue:**
- Several endpoints don't validate maximum input lengths
- Could lead to DoS attacks or database issues
- Examples:
  - `deal-chat/route.ts`: Message length not validated
  - `capture-deal/route.ts`: Text field could be extremely large
  - `off-market/search/route.ts`: Location string not length-limited

**Recommendation:**
```typescript
// Add length validation
const MAX_MESSAGE_LENGTH = 5000;
const MAX_TEXT_LENGTH = 50000;

if (message.length > MAX_MESSAGE_LENGTH) {
  return NextResponse.json({ error: "Message too long" }, { status: 400 });
}
```

---

### 7. **CORS Configuration - Hardcoded Origins**
**Severity:** HIGH  
**Location:** Multiple API routes

**Issue:**
- CORS origins are hardcoded
- If domain changes, need to update multiple files
- No environment variable configuration

**Current:**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NODE_ENV === "production"
    ? "https://searchfindr-app.vercel.app"
    : "http://localhost:3000",
  // ...
};
```

**Recommendation:**
- Use environment variable for allowed origins
- Consider using a CORS middleware/utility
- Add support for multiple allowed origins if needed

---

### 8. **Cron Endpoint Security - Header-Based Auth**
**Severity:** HIGH  
**Location:** `app/api/cron/on-market-ingest/route.ts`, `app/api/cron/reminders/route.ts`

**Issue:**
- Uses simple header-based secret (`x-cron-secret`)
- If secret is leaked, anyone can trigger cron jobs
- No IP allowlisting
- No request signing/verification

**Recommendation:**
- Use Vercel Cron's built-in authentication (if available)
- Implement request signing (HMAC)
- Add IP allowlisting for known Vercel IPs
- Consider using Vercel's cron job system instead of manual endpoints

---

### 9. **Error Messages May Leak Information**
**Severity:** HIGH  
**Location:** Multiple endpoints

**Issue:**
- Some error messages return detailed information:
  - Database error messages
  - OpenAI API error details
  - File validation errors

**Examples:**
```typescript
// app/api/analyze-text/route.ts line 140
return NextResponse.json(
  { error: 'Failed to call OpenAI API', details: textRes },
  { status: 502 }
);
```

**Recommendation:**
- Log detailed errors server-side only
- Return generic error messages to clients
- Use error codes for debugging

```typescript
// Log detailed error
logger.error('OpenAI API error:', textRes);

// Return generic error
return NextResponse.json(
  { error: 'Failed to process request. Please try again.' },
  { status: 502 }
);
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 10. **Client-Side Environment Variables**
**Severity:** MEDIUM  
**Location:** Multiple files

**Issue:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is exposed to client
- This is expected behavior for Supabase, but should be documented
- Ensure RLS (Row Level Security) is properly configured in Supabase

**Recommendation:**
- Verify Supabase RLS policies are correctly configured
- Document that this key is intentionally public
- Ensure no sensitive operations can be performed with anon key alone

---

### 11. **Missing Request Size Limits**
**Severity:** MEDIUM  
**Location:** Next.js configuration

**Issue:**
- No explicit body size limits configured
- Default Next.js limits may be too permissive

**Recommendation:**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Adjust based on needs
    },
  },
};
```

---

### 12. **SQL Injection Risk Assessment**
**Severity:** MEDIUM (Low Risk)  
**Location:** All database queries

**Status:** ✅ **GOOD**
- Using Supabase query builder which parameterizes queries
- No raw SQL construction found
- However, verify Supabase client properly escapes all inputs

**Recommendation:**
- Continue using query builder
- Never use raw SQL with string interpolation
- Consider adding automated SQL injection tests

---

## 🟢 POSITIVE SECURITY PRACTICES

1. ✅ **Workspace Isolation**: Most endpoints properly scope data to workspace
2. ✅ **File Type Validation**: Magic byte validation for uploaded files
3. ✅ **File Size Limits**: 25MB limit enforced
4. ✅ **Input Sanitization**: `sanitizeForPrompt` and `sanitizeShortText` functions used
5. ✅ **Authentication Pattern**: Centralized `authenticateRequest` function
6. ✅ **Authorization Checks**: Most endpoints verify deal ownership via workspace
7. ✅ **Error Handling**: Proper error types and handling
8. ✅ **Type Safety**: TypeScript used throughout

---

## IMMEDIATE ACTION ITEMS

### Priority 1 (Fix Immediately):
1. ✅ Add authentication to `/api/analyze-text`
2. ✅ Add authentication to `/api/on-market/search` (or document if intentionally public)
3. ✅ Add path traversal validation for storage paths
4. ✅ Add URL validation for SSRF protection
5. ✅ Implement distributed rate limiting

### Priority 2 (Fix This Week):
6. ✅ Add input length validation
7. ✅ Improve error message handling
8. ✅ Review and harden cron endpoint security

### Priority 3 (Fix This Month):
9. ✅ Configure request size limits
10. ✅ Review CORS configuration
11. ✅ Add security headers (CSP, HSTS, etc.)

---

## TESTING RECOMMENDATIONS

1. **Penetration Testing**: Hire external security firm or use automated tools
2. **Dependency Scanning**: Run `npm audit` regularly, consider Snyk or Dependabot
3. **OWASP ZAP**: Automated security scanning
4. **Manual Testing**: Test all identified vulnerabilities
5. **Load Testing**: Verify rate limiting works under load

---

## ADDITIONAL SECURITY RECOMMENDATIONS

1. **Security Headers**: Add security headers middleware
   ```typescript
   // Add to next.config.ts or middleware
   headers: [
     {
       key: 'X-Content-Type-Options',
       value: 'nosniff'
     },
     {
       key: 'X-Frame-Options',
       value: 'DENY'
     },
     {
       key: 'X-XSS-Protection',
       value: '1; mode=block'
     },
     {
       key: 'Strict-Transport-Security',
       value: 'max-age=31536000; includeSubDomains'
     }
   ]
   ```

2. **Logging & Monitoring**: 
   - Log all authentication failures
   - Monitor for suspicious patterns
   - Set up alerts for rate limit violations

3. **Secrets Management**:
   - Never commit secrets to git
   - Use environment variables (✅ already doing this)
   - Rotate secrets regularly
   - Use secret management service (AWS Secrets Manager, etc.)

4. **Database Security**:
   - Verify Supabase RLS policies
   - Regular backups
   - Monitor for unusual query patterns

5. **API Security**:
   - Consider API versioning
   - Add request ID tracking
   - Implement request signing for sensitive operations

---

## CONCLUSION

The application has a solid security foundation with good practices like workspace isolation, input sanitization, and file validation. However, **5 critical vulnerabilities** must be addressed immediately, particularly the unauthenticated endpoints and path traversal issues.

**Estimated Fix Time:**
- Critical issues: 1-2 days
- High priority: 3-5 days
- Medium priority: 1 week

**Risk Level:** 🔴 **HIGH** - Address critical issues before production deployment.

---

*This audit was performed on the codebase as of the current date. Regular security audits should be conducted quarterly or after major feature additions.*
