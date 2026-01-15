# POST-FIX SECURITY CHECKLIST

This document contains all the steps you need to complete after the security hardening fixes have been applied.

---

## 1. ENVIRONMENT VARIABLES

Add the following environment variables to your `.env.local` (development) and Vercel environment variables (production):

### Required Variables

```bash
# CORS Configuration (optional - defaults to production URL if not set)
ALLOWED_ORIGINS=https://searchfindr-app.vercel.app,http://localhost:3000

# Cron Secrets (for scheduled jobs)
ON_MARKET_CRON_SECRET=<generate-a-strong-random-secret-here>
CRON_SECRET=<generate-a-strong-random-secret-here>

# Existing variables (verify these are set)
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
OPENAI_API_KEY=<your-openai-key>
GOOGLE_MAPS_API_KEY=<your-google-maps-key>
```

### Generating Secure Secrets

For cron secrets, use a strong random string:
```bash
# On Linux/Mac:
openssl rand -hex 32

# Or use an online generator (at least 32 characters)
```

**IMPORTANT:** 
- Never commit these secrets to git
- Use different secrets for development and production
- Rotate secrets periodically (every 90 days recommended)

---

## 2. SUPABASE DATABASE SETUP

### A. Create Rate Limits Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create rate_limits table for distributed rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Optional: Add cleanup function (runs via cron or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE reset_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### B. Enable Row Level Security (RLS) on Critical Tables

Run these SQL commands to enable RLS and create policies:

```sql
-- Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see companies in their workspace
CREATE POLICY "Users can view companies in their workspace"
  ON companies FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can only insert companies into their workspace
CREATE POLICY "Users can insert companies into their workspace"
  ON companies FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can only update companies in their workspace
CREATE POLICY "Users can update companies in their workspace"
  ON companies FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Enable RLS on deal_chat_messages table
ALTER TABLE deal_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own chat messages in their workspace
CREATE POLICY "Users can view their chat messages"
  ON deal_chat_messages FOR SELECT
  USING (
    user_id = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can only insert their own chat messages
CREATE POLICY "Users can insert their chat messages"
  ON deal_chat_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can only delete their own chat messages
CREATE POLICY "Users can delete their chat messages"
  ON deal_chat_messages FOR DELETE
  USING (
    user_id = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Enable RLS on deal_activities table
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see activities in their workspace
CREATE POLICY "Users can view activities in their workspace"
  ON deal_activities FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can only insert activities in their workspace
CREATE POLICY "Users can insert activities in their workspace"
  ON deal_activities FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Enable RLS on financial_analyses table (if it exists)
ALTER TABLE financial_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see financial analyses in their workspace
CREATE POLICY "Users can view financial analyses in their workspace"
  ON financial_analyses FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can only insert/update financial analyses in their workspace
CREATE POLICY "Users can manage financial analyses in their workspace"
  ON financial_analyses FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );
```

### C. Verify RLS is Working

Test that RLS is properly configured:

```sql
-- As a test user, try to select from companies
-- This should only return rows where workspace_id matches the user's workspace
SELECT id, company_name, workspace_id FROM companies LIMIT 5;

-- Verify you can't see other workspaces' data
-- (This should return 0 rows if RLS is working)
SELECT COUNT(*) FROM companies 
WHERE workspace_id NOT IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
);
```

---

## 3. RATE LIMITING SETUP

### Option A: Supabase-Based (Recommended for Quick Setup)

The code now uses Supabase table-based rate limiting. After creating the `rate_limits` table (see section 2A), rate limiting will automatically work.

**To test:**
1. Make multiple requests to a rate-limited endpoint (e.g., `/api/analyze-text`)
2. After exceeding the limit, you should receive a 429 status code
3. Check the `rate_limits` table in Supabase to see entries

### Option B: Upstash Redis (For Production Scale)

If you need higher performance or have many serverless instances, consider Upstash Redis:

1. **Sign up for Upstash**: https://upstash.com/
2. **Create a Redis database**
3. **Get connection details**: URL and token
4. **Add environment variables**:
   ```bash
   UPSTASH_REDIS_URL=<your-redis-url>
   UPSTASH_REDIS_TOKEN=<your-redis-token>
   ```
5. **Update `lib/api/rate-limit-supabase.ts`** to use Upstash Redis instead (optional enhancement)

**Note:** The current implementation uses Supabase as a fallback, which works fine for most use cases.

---

## 4. VERIFY ENDPOINT PROTECTION

### Endpoints That Now Require Authentication

All of these endpoints now require a valid Bearer token:

1. **`/api/analyze-text`** - ✅ Now requires auth + rate limiting
2. **`/api/on-market/search`** - ✅ Now requires auth + rate limiting
3. **`/api/process-cim`** - ✅ Already had auth, now has path validation
4. **`/api/process-financials`** - ✅ Already had auth, now has path validation
5. **`/api/off-market/search`** - ✅ Already had auth, now has SSRF protection
6. **`/api/capture-deal`** - ✅ Already had auth, now has input validation
7. **`/api/deal-chat`** - ✅ Already had auth, now has input validation

### Manual Testing Steps

For each endpoint, test:

1. **Without authentication:**
   ```bash
   curl -X POST https://your-domain.com/api/analyze-text \
     -H "Content-Type: application/json" \
     -d '{"url":"test","text":"test"}'
   ```
   **Expected:** 401 Unauthorized

2. **With invalid token:**
   ```bash
   curl -X POST https://your-domain.com/api/analyze-text \
     -H "Authorization: Bearer invalid-token" \
     -H "Content-Type: application/json" \
     -d '{"url":"test","text":"test"}'
   ```
   **Expected:** 401 Unauthorized

3. **With valid token (from your app):**
   ```bash
   curl -X POST https://your-domain.com/api/analyze-text \
     -H "Authorization: Bearer <valid-token>" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://example.com","text":"test listing"}'
   ```
   **Expected:** 200 OK (if within rate limits)

4. **Rate limiting test:**
   - Make 21 requests to `/api/analyze-text` (limit is 20/hour)
   - The 21st request should return 429 Too Many Requests

### Path Traversal Protection Test

Test that path traversal is blocked:

```bash
# This should be rejected
curl -X POST https://your-domain.com/api/process-cim \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "valid-id",
    "cimStoragePath": "../../../etc/passwd"
  }'
```
**Expected:** 400 Bad Request with "Invalid storage path"

### SSRF Protection Test

The off-market search endpoint now validates URLs before fetching. Test with:

```bash
# This should be blocked
curl -X POST https://your-domain.com/api/off-market/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "industries": ["hvac"],
    "location": "Austin, TX",
    "radius_miles": 10
  }'
```

The `fetchHomepageText` function will now reject:
- `http://localhost`
- `http://127.0.0.1`
- `http://169.254.169.254` (cloud metadata)
- `http://10.0.0.1` (private IPs)
- Any non-HTTP/HTTPS URLs

---

## 5. CRON ENDPOINT SECURITY

### Verify Cron Secrets

Test that cron endpoints reject invalid secrets:

```bash
# Should fail
curl -X POST https://your-domain.com/api/cron/on-market-ingest \
  -H "x-cron-secret: wrong-secret"

# Should succeed (with correct secret)
curl -X POST https://your-domain.com/api/cron/on-market-ingest \
  -H "x-cron-secret: <ON_MARKET_CRON_SECRET>"
```

### Vercel Cron Configuration

If using Vercel Cron, update your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/on-market-ingest",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Note:** Vercel Cron automatically adds authentication headers. You may want to update the cron endpoints to check for Vercel's `x-vercel-signature` header instead of `x-cron-secret` for better security.

---

## 6. MONITORING & ALERTS

### Recommended Monitoring

1. **Rate Limit Violations:**
   - Monitor 429 responses in your logs
   - Set up alerts if rate limit violations spike

2. **Authentication Failures:**
   - Monitor 401 responses
   - Alert on suspicious patterns (many failures from same IP)

3. **Path Traversal Attempts:**
   - Check logs for "Invalid storage path" warnings
   - These indicate potential attack attempts

4. **SSRF Attempts:**
   - Check logs for "Invalid URL blocked" warnings
   - Monitor for attempts to access internal resources

### Log Queries (if using a logging service)

```sql
-- Find rate limit violations
SELECT * FROM logs 
WHERE status_code = 429 
ORDER BY timestamp DESC;

-- Find authentication failures
SELECT * FROM logs 
WHERE status_code = 401 
ORDER BY timestamp DESC;

-- Find security warnings
SELECT * FROM logs 
WHERE message LIKE '%Invalid storage path%' 
   OR message LIKE '%Invalid URL blocked%';
```

---

## 7. DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All environment variables are set in Vercel
- [ ] Rate limits table created in Supabase
- [ ] RLS policies created and tested
- [ ] Cron secrets generated and set
- [ ] CORS origins configured (if using custom domain)
- [ ] All endpoints tested for authentication
- [ ] Rate limiting tested
- [ ] Path traversal protection verified
- [ ] SSRF protection verified
- [ ] Error messages don't leak sensitive info
- [ ] TypeScript build passes (`npm run build`)
- [ ] No linter errors

---

## 8. POST-DEPLOYMENT VERIFICATION

After deployment:

1. **Test authentication:**
   - Verify unauthenticated requests are rejected
   - Verify invalid tokens are rejected

2. **Test rate limiting:**
   - Make requests until you hit the limit
   - Verify 429 responses

3. **Test input validation:**
   - Send oversized inputs
   - Verify 400 responses with appropriate errors

4. **Monitor logs:**
   - Check for any unexpected errors
   - Verify security warnings are logged

5. **Test normal functionality:**
   - Ensure all features still work
   - Verify workspace isolation is maintained

---

## 9. SUMMARY OF CHANGES

### Security Fixes Applied

✅ **Authentication:**
- `/api/analyze-text` - Now requires authentication
- `/api/on-market/search` - Now requires authentication

✅ **Path Traversal Protection:**
- `/api/process-cim` - Validates storage paths
- `/api/process-financials` - Validates storage paths

✅ **SSRF Protection:**
- `/api/off-market/search` - Validates URLs before fetching

✅ **Rate Limiting:**
- All endpoints now use distributed rate limiting (Supabase-based)
- Configurable limits per endpoint

✅ **Input Validation:**
- All endpoints validate input lengths
- Prevents DoS attacks via oversized inputs

✅ **Error Hardening:**
- Removed sensitive error details from client responses
- Detailed errors logged server-side only

✅ **CORS Configuration:**
- Centralized CORS headers
- Configurable via environment variable

✅ **Cron Security:**
- Constant-time secret comparison
- Generic error messages

---

## 10. NEXT STEPS (OPTIONAL ENHANCEMENTS)

1. **Upgrade to Upstash Redis** for rate limiting (if needed for scale)
2. **Add request signing** for cron endpoints (HMAC)
3. **Implement IP allowlisting** for cron endpoints
4. **Add security headers** (CSP, HSTS, etc.) in `next.config.ts`
5. **Set up automated security scanning** (Snyk, Dependabot)
6. **Regular security audits** (quarterly recommended)

---

## QUESTIONS OR ISSUES?

If you encounter any issues:

1. Check the logs for detailed error messages
2. Verify all environment variables are set
3. Ensure Supabase RLS policies are correctly configured
4. Test endpoints individually to isolate issues

---

**Last Updated:** After security hardening pass
**Status:** ✅ All critical vulnerabilities fixed
