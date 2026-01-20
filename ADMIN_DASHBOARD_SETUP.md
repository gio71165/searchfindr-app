# Admin Dashboard Setup Guide

This guide will help you set up the admin dashboard and configure your account as an admin.

## Step 1: Run SQL Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the entire contents of `migrations/004_admin_dashboard_setup.sql`
4. Click **Run** to execute the migration

This will:
- Add `is_admin` column to the `profiles` table
- Create the `usage_logs` table for tracking API usage
- Set up necessary indexes and policies

## Step 2: Make Your Account an Admin

After running the migration, you need to set your user account as an admin. Run this SQL query in Supabase SQL Editor:

```sql
-- Replace 'YOUR_EMAIL@example.com' with your actual login email
UPDATE profiles
SET is_admin = TRUE
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'YOUR_EMAIL@example.com'
);
```

**Example:**
If your email is `admin@searchfindr.com`, run:
```sql
UPDATE profiles
SET is_admin = TRUE
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'admin@searchfindr.com'
);
```

## Step 3: Verify Admin Access

1. Log out and log back into your application
2. You should now see an **"Admin Dashboard"** option in your user menu (top right)
3. Click it to access `/admin`

## Step 4: Environment Variables (Already Set)

Make sure you have these environment variables set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The `SUPABASE_SERVICE_ROLE_KEY` is required for the admin dashboard to query all data.

## Step 5: Usage Logging (Optional)

Usage logging is automatically enabled for the `/api/process-cim` endpoint as an example. To add it to other API routes, follow this pattern:

```typescript
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let statusCode = 500;
  let errorMessage: string | undefined;
  
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);
    
    // ... your API logic ...
    
    statusCode = 200;
    const response = NextResponse.json({ success: true, ... });
    
    // Log usage
    const { logUsage, getIpAddress, getUserAgent } = await import('@/lib/api/usage-logger');
    await logUsage({
      userId: user.id,
      workspaceId: workspace.id,
      endpoint: 'your-endpoint-name',
      method: 'POST',
      statusCode,
      responseTimeMs: Date.now() - startTime,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
    
    return response;
  } catch (err) {
    // Log errors too
    const { logUsage, getIpAddress, getUserAgent } = await import('@/lib/api/usage-logger');
    await logUsage({
      endpoint: 'your-endpoint-name',
      method: 'POST',
      statusCode,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      responseTimeMs: Date.now() - startTime,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
    
    throw err;
  }
}
```

## What the Admin Dashboard Shows

### Overview Tab
- **Total Users**: Count of all users and recent signups (7 days)
- **Workspaces**: Number of unique workspaces
- **Total Deals**: Count of all deals in the system
- **Activities (24h)**: Recent deal activities
- **API Endpoint Usage**: Requests per endpoint with response times and error counts
- **Top Workspaces**: Workspaces sorted by deal count

### Users Tab
- Complete list of all users
- Email addresses
- Workspace IDs
- Deal counts per user
- Usage statistics (last 7 days)
- Last active date
- Admin status

### API Usage Tab
- Rate limit status
- Endpoint usage statistics

## Security Notes

1. **Admin Access**: Only users with `is_admin = TRUE` in the `profiles` table can access `/admin`
2. **API Protection**: All admin API endpoints (`/api/admin/*`) verify admin status
3. **Service Role Key**: Admin queries use the service role key to bypass RLS and access all data
4. **Usage Logs**: Usage logs are stored with RLS disabled (service role only) for performance

## Troubleshooting

### "Access denied" error
- Make sure you ran the SQL to set `is_admin = TRUE` for your account
- Log out and log back in after updating your admin status
- Check that your user ID matches in both `auth.users` and `profiles` tables

### Dashboard shows no data
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in your environment variables
- Check that the migration ran successfully (verify tables exist in Supabase)
- Check browser console for errors

### Usage logs not appearing
- Usage logging is currently only enabled for `/api/process-cim` as an example
- Add logging to other endpoints using the pattern shown above
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly

## Next Steps

1. Run the SQL migration
2. Set your account as admin
3. Access `/admin` to view the dashboard
4. Optionally add usage logging to more API endpoints
