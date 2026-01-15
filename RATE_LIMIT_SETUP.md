# Rate Limiting Setup - Distributed Supabase Table

## Section 1: SQL to Create Table and Indexes

**Copy and paste this entire block into Supabase SQL Editor:**

```sql
-- ============================================================
-- RATE LIMITS TABLE SETUP
-- ============================================================
-- This table stores distributed rate limiting data
-- Used by all API endpoints to prevent abuse
-- ============================================================

-- Create the rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on key for fast lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);

-- Create index on reset_at for cleanup queries (expired entries)
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Add comment for documentation
COMMENT ON TABLE public.rate_limits IS 'Distributed rate limiting table. Stores rate limit counters keyed by userId:endpoint.';
COMMENT ON COLUMN public.rate_limits.key IS 'Rate limit key format: ratelimit:{userId}:{endpoint}';
COMMENT ON COLUMN public.rate_limits.count IS 'Current request count within the time window';
COMMENT ON COLUMN public.rate_limits.reset_at IS 'Timestamp when the rate limit window resets';
```

---

## Section 2: RLS Decision and Configuration

### RLS Decision: **DISABLED** ✅

**Why RLS should be DISABLED:**

1. **Server-only table**: This table is only accessed by server-side API routes, never by client-side code
2. **No user data**: Contains only rate limit counters (not sensitive user information)
3. **Access already controlled**: All endpoints that use rate limiting require authentication at the application layer
4. **Service role access**: Server routes use service role or authenticated Supabase clients, which bypass RLS anyway
5. **Simpler and safer**: Disabling RLS avoids policy complexity and potential misconfigurations

**SQL to ensure RLS is disabled:**

```sql
-- Ensure RLS is disabled on rate_limits table
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled (should return 'f' for false)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'rate_limits';
```

**Expected result:** `rowsecurity` should be `f` (false)

---

## Section 3: Environment Variables Required

### ✅ **NO NEW ENVIRONMENT VARIABLES NEEDED**

The distributed rate limiting uses your **existing Supabase configuration**:

- ✅ `NEXT_PUBLIC_SUPABASE_URL` (already exists)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already exists) - Used for authenticated requests
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (already exists) - Used for service role operations

**How it works:**
- The `checkRateLimit()` function receives a Supabase client that's already configured
- The client uses the existing environment variables automatically
- No additional configuration needed

**Optional Enhancement (Future):**
- If you want to use **Upstash Redis** instead of Supabase for even better performance, you would need:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- **This is NOT required** - Supabase table works perfectly for distributed rate limiting

---

## Section 4: Verification Checklist

### Step 1: Verify Table Exists

Run this SQL in Supabase SQL Editor:

```sql
-- Check if table exists
SELECT to_regclass('public.rate_limits');

-- Should return: 'rate_limits'
-- If NULL, the table doesn't exist (run Section 1 SQL)
```

**Expected result:** `rate_limits` (not NULL)

---

### Step 2: Verify Table Schema

Run this SQL to confirm all columns exist:

```sql
-- Verify table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'rate_limits'
ORDER BY ordinal_position;
```

**Expected result:** 6 columns:
- `id` (uuid, not null)
- `key` (text, not null)
- `count` (integer, not null, default 1)
- `reset_at` (timestamp with time zone, not null)
- `created_at` (timestamp with time zone, default NOW())
- `updated_at` (timestamp with time zone, default NOW())

---

### Step 3: Verify Indexes Exist

```sql
-- Verify indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'rate_limits'
ORDER BY indexname;
```

**Expected result:** At least 3 indexes:
- `rate_limits_pkey` (primary key on `id`)
- `idx_rate_limits_key` (on `key` column)
- `idx_rate_limits_reset_at` (on `reset_at` column)

---

### Step 4: Verify RLS is Disabled

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'rate_limits';
```

**Expected result:** `rowsecurity` = `f` (false)

---

### Step 5: Test Table Access (Manual Insert/Select)

```sql
-- Test insert (should work)
INSERT INTO public.rate_limits (key, count, reset_at)
VALUES ('ratelimit:test-user:test-endpoint', 1, NOW() + INTERVAL '1 hour')
ON CONFLICT (key) DO NOTHING;

-- Test select (should return the row)
SELECT * FROM public.rate_limits WHERE key = 'ratelimit:test-user:test-endpoint';

-- Clean up test data
DELETE FROM public.rate_limits WHERE key = 'ratelimit:test-user:test-endpoint';
```

**Expected result:** Insert succeeds, select returns 1 row, delete succeeds

---

### Step 6: Verify Application is Using Distributed Rate Limiting

**Method A: Check Server Logs**

1. Make a request to any rate-limited endpoint (e.g., `/api/analyze-text`)
2. Check your server logs (Vercel logs, local console, etc.)
3. **Look for:** NO warnings like "Rate limit table not found, falling back to in-memory limiter"
4. **If you see that warning:** The table doesn't exist or there's a connection issue

**Method B: Check Database Directly**

1. Make a few requests to a rate-limited endpoint
2. Run this SQL:

```sql
-- Check if rate limit entries are being created
SELECT 
  key,
  count,
  reset_at,
  created_at,
  updated_at
FROM public.rate_limits
ORDER BY updated_at DESC
LIMIT 10;
```

**Expected result:** You should see entries with keys like:
- `ratelimit:{userId}:analyze-text`
- `ratelimit:{userId}:on-market-search`
- etc.

**If no rows appear:** The app is still using in-memory fallback (check logs for errors)

---

### Step 7: Trigger a Real Rate Limit (429 Response)

**Test with a low-limit endpoint:**

1. **Find an endpoint with a low limit** (e.g., `off-market-search` = 5/hour)
2. **Make 6 requests quickly** to `/api/off-market/search` with valid auth token
3. **Expected behavior:**
   - First 5 requests: Return 200 OK
   - 6th request: Return 429 with message "Rate limit exceeded. Maximum 5 requests per hour. Please try again later."

**Verify in database:**

```sql
-- Check the rate limit entry for your test
SELECT 
  key,
  count,
  reset_at,
  CASE 
    WHEN reset_at > NOW() THEN 'Active (not expired)'
    ELSE 'Expired'
  END as status
FROM public.rate_limits
WHERE key LIKE 'ratelimit:%:off-market-search'
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected result:** 
- `count` = 5 (or 6 if it incremented before blocking)
- `status` = 'Active (not expired)'
- `reset_at` = timestamp ~1 hour in the future

---

### Step 8: Verify Distributed Behavior (Multi-Instance)

**If you're running multiple server instances (e.g., Vercel with multiple regions):**

1. Make requests from different regions/IPs
2. All should share the same rate limit counter
3. If one instance hits the limit, all instances should block that user

**Test:**
- Make 3 requests from instance A
- Make 3 requests from instance B (same user, same endpoint with limit 5)
- Instance B's 3rd request should be blocked (total = 5)

**Verify:**

```sql
-- Check that count reflects requests from all instances
SELECT 
  key,
  count,
  updated_at
FROM public.rate_limits
WHERE key LIKE 'ratelimit:%:off-market-search'
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected result:** `count` should reflect total requests across all instances

---

## Troubleshooting

### Issue: "Rate limit table not found" warning in logs

**Solution:**
1. Verify table exists: `SELECT to_regclass('public.rate_limits');`
2. If NULL, run Section 1 SQL again
3. Check Supabase connection: Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
4. Check permissions: Ensure your Supabase client has access (service role or authenticated user)

### Issue: Rate limits not working (no 429 responses)

**Solution:**
1. Check if Supabase client is being passed: Verify `checkRateLimit()` is called with `supabase` parameter
2. Check database: Run Step 6 queries to see if entries are being created
3. Check logs: Look for any Supabase errors
4. Verify authentication: Rate limiting only works on authenticated endpoints

### Issue: Rate limits resetting too early

**Solution:**
1. Check `reset_at` values in database
2. Verify server time is synchronized (important for distributed systems)
3. Check if cleanup job is deleting entries prematurely

---

## Optional: Cleanup Job (Recommended)

**Set up a periodic cleanup to remove expired rate limit entries:**

```sql
-- Create a function to clean up expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE reset_at < NOW() - INTERVAL '1 day';
  -- Keep entries for 1 day after expiration for debugging
END;
$$;

-- You can call this manually or set up a cron job
-- To run manually:
SELECT cleanup_expired_rate_limits();
```

**Or set up Supabase Cron (if available):**
- Schedule: Daily at 2 AM
- SQL: `SELECT cleanup_expired_rate_limits();`

---

## Summary

✅ **What you've done:**
1. Created `rate_limits` table with proper schema
2. Created indexes for performance
3. Disabled RLS (server-only table)
4. Verified table exists and is accessible

✅ **What happens now:**
- All API endpoints will use distributed rate limiting
- Rate limits work across all server instances
- No in-memory fallback in production
- Rate limit data persists across server restarts

✅ **No code changes needed:**
- Your existing code already supports this
- Just needed the database table

---

**Next Steps:**
1. Run Section 1 SQL in Supabase
2. Run Section 2 SQL to verify RLS is disabled
3. Run verification steps (Section 4)
4. Monitor logs to confirm no fallback warnings
5. Test rate limiting with Step 7

**You're done!** 🎉
