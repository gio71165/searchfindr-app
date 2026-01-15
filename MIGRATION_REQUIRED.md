# ⚠️ Database Migration Required

## Quick Answer: YES, you need to add columns to Supabase

The pass deal functionality requires these database columns to work:

### **ESSENTIAL (Required for Pass Deal to Work):**
1. `pass_reason` (TEXT) - Stores why a deal was passed
2. `pass_notes` (TEXT) - Optional additional notes
3. `stage` (TEXT) - Tracks deal stage (new, reviewing, passed, etc.)
4. `last_action_at` (TIMESTAMPTZ) - When last action was taken

### **OPTIONAL (For Future Features):**
- `verdict` - User verdict (proceed/park/pass)
- `verdict_reason` - Why the verdict was set
- `next_action` - What action is planned
- `sba_eligible` - Whether deal is SBA eligible
- `deal_size_band` - Size category of the deal

## How to Add Them

### Option 1: Minimal (Just Pass Deal Functionality)
Run this SQL in Supabase SQL Editor:

```sql
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS pass_reason TEXT,
  ADD COLUMN IF NOT EXISTS pass_notes TEXT,
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'reviewing', 'follow_up', 'ioi_sent', 'loi', 'dd', 'passed', 'closed_won', 'closed_lost')),
  ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ DEFAULT NOW();
```

### Option 2: Full Migration (All Features)
Run the full migration from `migrations/001_add_deal_state_tracking.sql` which includes:
- All pass deal columns
- Verdict tracking
- Activity logging table
- Stage tracking
- And more

## Steps:
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the SQL from Option 1 (minimal) or Option 2 (full)
4. Click "Run"
5. Refresh your app

## Current Status
Right now, the code is trying to use these columns but they don't exist in your database, which is why you're getting errors like:
- `column companies.pass_reason does not exist`
- `column companies.updated_at does not exist` (we removed this one)

After running the migration, everything should work!
