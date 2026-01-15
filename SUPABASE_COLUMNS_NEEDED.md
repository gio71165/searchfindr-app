# Supabase Columns Needed

Based on the codebase, these columns should exist in the `companies` table. Most are already in the migration file (`migrations/001_add_deal_state_tracking.sql`).

## Required Columns for Current Features

1. **Stage tracking:**
   - `stage` TEXT DEFAULT 'new' CHECK (stage IN ('new', 'reviewing', 'follow_up', 'ioi_sent', 'loi', 'dd', 'passed', 'closed_won', 'closed_lost'))

2. **Pass Deal functionality:**
   - `pass_reason` TEXT
   - `pass_notes` TEXT  
   - `passed_at` TIMESTAMPTZ
   - `last_action_at` TIMESTAMPTZ DEFAULT NOW()

3. **Verdict tracking:**
   - `verdict` TEXT CHECK (verdict IN ('proceed', 'park', 'pass', null))
   - `verdict_reason` TEXT
   - `verdict_confidence` TEXT CHECK (verdict_confidence IN ('high', 'medium', 'low', null))
   - `next_action` TEXT
   - `next_action_date` DATE

4. **Deal economics (for display):**
   - `asking_price_extracted` TEXT
   - `revenue_ttm_extracted` TEXT
   - `ebitda_ttm_extracted` TEXT

5. **Filters:**
   - `sba_eligible` BOOLEAN
   - `deal_size_band` TEXT CHECK (deal_size_band IN ('sub_1m', '1m_3m', '3m_5m', '5m_plus', null))

## All SQL Migrations Available

1. `add_stage_column.sql` - Stage column only
2. `add_verdict_columns.sql` - Verdict and related columns
3. `add_sba_columns.sql` - SBA and deal size columns
4. `add_extracted_columns.sql` - Extracted financial columns
5. `migrations/001_add_deal_state_tracking.sql` - Full migration (includes everything)
6. `migrations/002_minimal_pass_deal_columns.sql` - Minimal pass deal columns only

**Recommendation:** Run the full migration `migrations/001_add_deal_state_tracking.sql` which includes all columns.
