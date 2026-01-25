# Security Audit & Hardening Documentation

## Overview
This document outlines the comprehensive security measures implemented in the SearchFindr application to ensure it operates as a secure vault for user data.

## Security Measures Implemented

### 1. Authentication & Authorization

#### API Authentication
- **Bearer Token Authentication**: All API endpoints require valid Bearer tokens
- **API Key Authentication**: Secure API key system with bcrypt hashing for Chrome extension
- **Workspace Scoping**: All data access is automatically scoped to user's workspace
- **Row Level Security (RLS)**: Database-level security policies enforce data isolation

#### Key Files:
- `lib/api/auth.ts` - Centralized authentication
- `lib/data-access/base.ts` - Workspace-scoped data access

### 2. Error Handling & Information Leakage Prevention

#### Centralized Error Handler
- **Location**: `lib/api/error-handler.ts`
- **Features**:
  - Sanitizes all error messages before sending to clients
  - Never exposes database internals, SQL errors, or stack traces
  - Logs full error details server-side only
  - Provides user-friendly error messages

#### Error Sanitization Rules:
- Database errors → "A database error occurred. Please try again later."
- Authentication errors → "Authentication failed. Please check your credentials."
- SQL/Query errors → Generic error message (never exposes schema)
- Stack traces → Never exposed to clients

#### Updated Files:
- `lib/data-access/base.ts` - Database error handling sanitized
- `app/api/capture-deal/route.ts` - Uses centralized error handler
- `app/api/analyze-text/route.ts` - Uses centralized error handler
- `app/api/deal-chat/route.ts` - Uses centralized error handler
- `app/auth/callback/route.ts` - Error messages sanitized

### 3. Input Validation & Sanitization

#### Input Validation
- **Location**: `lib/api/security.ts`
- **Features**:
  - URL validation (prevents SSRF attacks)
  - Storage path validation (prevents path traversal)
  - Input length limits
  - Constant-time string comparison (prevents timing attacks)

#### Sanitization
- **Location**: `lib/utils/sanitize.ts`
- **Features**:
  - Prompt injection prevention
  - Special character escaping
  - Length limiting

#### File Validation
- **Location**: `lib/api/file-validation.ts`
- **Features**:
  - Magic byte verification (file type validation)
  - File size limits (25MB max)
  - MIME type validation
  - Prevents malicious file uploads

### 4. Security Headers & Middleware

#### Security Headers
- **Location**: `lib/api/security-middleware.ts`
- **Headers Implemented**:
  - `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
  - `X-Frame-Options: DENY` - Prevents clickjacking
  - `X-XSS-Protection: 1; mode=block` - XSS protection
  - `Strict-Transport-Security` - HTTPS enforcement (production)
  - `Content-Security-Policy` - Restricts resource loading
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` - Restricts browser features

#### CSRF Protection
- Origin validation for state-changing requests (POST, PUT, DELETE, PATCH)
- CORS headers configured properly
- Allowed origins from environment variables

### 5. Logging & Sensitive Data Protection

#### Secure Logging
- **Location**: `lib/utils/logger.ts`
- **Features**:
  - Automatic sanitization of sensitive data in logs
  - API keys masked (shows only prefix)
  - Tokens redacted
  - Passwords/secrets never logged
  - Development-only info/warn logs

#### Sanitized Patterns:
- API keys (sf_ prefix) → Shows first 8 chars + "***REDACTED***"
- Bearer tokens → "Bearer ***REDACTED***"
- Long random strings → Masked
- Common secret field names → Redacted

### 6. Rate Limiting

#### Implementation
- **Location**: `lib/api/rate-limit.ts`, `lib/api/rate-limit-supabase.ts`
- **Features**:
  - Per-user, per-endpoint rate limiting
  - Distributed rate limiting via Supabase
  - Configurable limits per endpoint
  - Automatic cleanup of expired entries

#### Protected Endpoints:
- All AI-powered endpoints (process-cim, analyze-deal, etc.)
- Search endpoints
- File upload endpoints
- Deal creation endpoints

### 7. File Upload Security

#### Validation
- File type verification via magic bytes (not just extension)
- File size limits enforced
- Path traversal prevention
- Workspace-scoped storage paths

#### Supported File Types:
- PDF (magic bytes: %PDF)
- DOCX (ZIP signature verification)
- DOC (OLE2 signature verification)
- XLSX (ZIP signature verification)
- XLS (OLE2 signature verification)
- CSV (content-based validation)

### 8. Database Security

#### Row Level Security (RLS)
- All tables have RLS policies enabled
- Workspace-based data isolation
- User can only access their own workspace data
- Service role used only for server-side operations

#### Query Security
- Supabase query builder (parameterized queries - prevents SQL injection)
- Workspace scoping enforced at repository level
- No raw SQL queries with user input

### 9. Environment Variables Security

#### Public Variables (Safe to expose)
- `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key (RLS-protected)

#### Server-Only Variables (Never exposed)
- `SUPABASE_SERVICE_ROLE_KEY` - Only used server-side
- `OPENAI_API_KEY` - Only used server-side
- All other secrets - Server-side only

### 10. API Key Security

#### API Key Features
- Bcrypt hashing with salt
- Prefix-based lookup (prevents timing attacks)
- Expiration support
- Revocation support
- Last used tracking

### 11. SSRF Protection

#### URL Validation
- Blocks localhost and loopback addresses
- Blocks private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
- Blocks cloud metadata endpoints
- Blocks .local and .internal domains
- Only allows HTTP/HTTPS protocols

## Security Best Practices

### For Developers

1. **Always use centralized error handler**:
   ```typescript
   import { handleApiError } from "@/lib/api/error-handler";
   // In catch block:
   return handleApiError(error, { endpoint: "your-endpoint", userId: user?.id });
   ```

2. **Always validate input**:
   ```typescript
   import { validateInputLength, sanitizeInput } from "@/lib/api/security";
   const error = validateInputLength(input, MAX_LENGTH, 'Field name');
   if (error) return NextResponse.json({ error }, { status: 400 });
   ```

3. **Always use workspace scoping**:
   ```typescript
   const deals = new DealsRepository(supabase, workspace.id);
   // All queries automatically scoped to workspace
   ```

4. **Never log sensitive data**:
   ```typescript
   import { logger } from "@/lib/utils/logger";
   // Logger automatically sanitizes sensitive data
   logger.error("Error occurred", { apiKey: key }); // apiKey will be masked
   ```

5. **Always use security headers**:
   ```typescript
   import { withSecurityHeaders } from "@/lib/api/security-middleware";
   export const POST = withSecurityHeaders(POST);
   ```

### Common Security Pitfalls to Avoid

1. ❌ **Don't expose error details**:
   ```typescript
   // BAD
   return NextResponse.json({ error: error.message }, { status: 500 });
   
   // GOOD
   return handleApiError(error, { endpoint: "your-endpoint" });
   ```

2. ❌ **Don't log sensitive data directly**:
   ```typescript
   // BAD
   console.error("API key:", apiKey);
   
   // GOOD
   logger.error("API key error", { apiKey }); // Auto-sanitized
   ```

3. ❌ **Don't trust user input**:
   ```typescript
   // BAD
   const query = `SELECT * FROM deals WHERE id = '${userId}'`;
   
   // GOOD
   const { data } = await supabase.from('deals').select('*').eq('id', userId);
   ```

4. ❌ **Don't expose database errors**:
   ```typescript
   // BAD
   throw new DatabaseError(`SQL Error: ${error.message}`, 500);
   
   // GOOD (already fixed in base.ts)
   throw new DatabaseError("A database error occurred", 500);
   ```

## Security Checklist

- [x] Authentication on all API endpoints
- [x] Workspace-based data isolation
- [x] Error message sanitization
- [x] Input validation and sanitization
- [x] File upload security (magic bytes, size limits)
- [x] Rate limiting on sensitive endpoints
- [x] Security headers (XSS, clickjacking, etc.)
- [x] CSRF protection
- [x] SSRF protection
- [x] Secure logging (sensitive data masked)
- [x] SQL injection prevention (parameterized queries)
- [x] Path traversal prevention
- [x] Environment variable security
- [x] API key security (bcrypt, expiration, revocation)

## Ongoing Security Maintenance

1. **Regular Security Audits**: Review this document quarterly
2. **Dependency Updates**: Keep all dependencies up to date
3. **Security Headers**: Monitor and update CSP as needed
4. **Rate Limiting**: Adjust limits based on usage patterns
5. **Error Monitoring**: Review error logs for suspicious patterns
6. **Access Logs**: Monitor for unauthorized access attempts

## Incident Response

If a security issue is discovered:

1. **Immediate Actions**:
   - Revoke affected API keys
   - Review access logs
   - Check for data exfiltration

2. **Documentation**:
   - Document the vulnerability
   - Create a fix plan
   - Test the fix thoroughly

3. **Communication**:
   - Notify affected users if necessary
   - Update security documentation
   - Consider security advisory if critical

## Contact

For security concerns, please contact the development team immediately.

---

**Last Updated**: 2024
**Security Audit Status**: ✅ Complete
**Next Review Date**: Quarterly
