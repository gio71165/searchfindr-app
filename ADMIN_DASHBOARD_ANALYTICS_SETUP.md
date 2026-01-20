# Admin Dashboard Analytics Setup

This guide covers the new comprehensive analytics dashboard setup.

## ✅ What's Already Done

1. **Recharts library** - Installed and ready to use
2. **Analytics API endpoints** - All 5 endpoints created:
   - `/api/admin/analytics/overview` - Metric cards data
   - `/api/admin/analytics/activity-trend` - 30-day activity trend
   - `/api/admin/analytics/feature-adoption` - Feature adoption percentages
   - `/api/admin/analytics/users-detailed` - Detailed user stats
   - `/api/admin/analytics/activity-feed` - Recent activity events
3. **Dashboard UI** - Fully refactored with light mode, charts, and enhanced features

## 📋 SQL Setup (If Needed)

### Option 1: No Additional SQL Required (Recommended)

The dashboard works **immediately** using existing tables:
- `profiles` - User data
- `companies` - Deals, CIMs, financials
- `deal_activities` - Activity logs
- `deal_chat_messages` - Chat usage
- `usage_logs` - API usage

**No SQL migration needed** - just access `/admin` after setting your account as admin!

### Option 2: Optional Analytics Events Table (Future Use)

If you want to track more granular events in the future, you can optionally run:

```sql
-- Run migrations/005_analytics_events_optional.sql
```

This creates an `analytics_events` table for future event tracking, but **it's not required** for the current dashboard to work.

## 🚀 Quick Start

1. **Make sure you've run the admin setup:**
   - Run `migrations/004_admin_dashboard_setup.sql` (from previous setup)
   - Set your account as admin using `SETUP_ADMIN_ACCOUNT.sql`

2. **Access the dashboard:**
   - Log in to your account
   - Click your user menu (top right)
   - Click "Admin Dashboard"
   - Or navigate directly to `/admin`

3. **That's it!** The dashboard will load all analytics automatically.

## 📊 Dashboard Features

### Top Row - 6 Metric Cards
- **Total Users** - Count + new this week
- **Active Users (7d)** - Users with activity + % of total
- **CIMs Analyzed** - All-time + this week
- **Financials Analyzed** - All-time + this week
- **Total Deals** - Count + active deals
- **Churn Risk** - % inactive 7+ days (red if >20%)

### Charts Section
- **Left: Activity Trend** - Line chart showing CIMs, Financials, and Deals over last 30 days
- **Right: Feature Adoption** - Horizontal bar chart showing % adoption for:
  - Pipeline, CIM Analysis, Financials Analysis, Chrome Extension, Off-Market Search, Reminders, Deal Chat
  - Color-coded: Green (>70%), Yellow (40-70%), Red (<40%)

### User Table
- **Sortable columns**: Email, Signed Up, Last Active, CIMs, Financials, Deals
- **Search**: Filter by email
- **Pipeline Breakdown**: Visual bar showing deal stage distribution
- **Expandable rows**: Click to see detailed stage breakdown
- **Inactive users**: Highlighted in red if inactive 7+ days

### Activity Feed
- Real-time feed of last 50 events
- Shows: CIM uploads, financials uploads, stage changes, verdicts, etc.
- Relative timestamps (e.g., "2 hours ago")

## 🎨 Design

- **Light mode only** - Clean white/light gray background
- **Brand colors** - Blue (#3B82F6) for primary accents
- **Responsive** - Works on desktop (mobile optimized)
- **Clean & minimal** - Subtle shadows, rounded corners, good spacing

## 🔧 Troubleshooting

### Dashboard shows no data
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Check browser console for errors
- Ensure you're logged in as an admin

### Charts not rendering
- Verify Recharts is installed: `npm list recharts`
- Check browser console for chart errors
- Ensure data is loading (check Network tab)

### User table empty
- Check that users exist in `profiles` table
- Verify API endpoint `/api/admin/analytics/users-detailed` returns data
- Check browser console for errors

### Activity feed empty
- Verify `deal_activities` table has data
- Check that activities have `user_id` set
- Ensure API endpoint `/api/admin/analytics/activity-feed` works

## 📝 Notes

- **No subscription system** - All users show "Active" plan status
- **Pipeline stages** - Derived from `companies.stage` column
- **Churn risk** - Calculated as % of users inactive 7+ days (red if >20%)
- **Feature adoption** - Based on actual usage (has deals, has CIMs, etc.)
- **Last active** - Derived from `usage_logs` and `deal_activities` tables

## 🔄 Future Enhancements

If you want to add more granular tracking later:
1. Run `migrations/005_analytics_events_optional.sql`
2. Add event logging to your API routes
3. Update dashboard to use `analytics_events` table

For now, everything works with existing tables!
