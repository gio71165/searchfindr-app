# Archive and Delete Implementation Summary

## Overview
Implemented archive (soft delete) and permanent delete functionality for deals, with safety measures to prevent accidental data loss.

## Changes Made

### 1. Database Migration
**File:** `migrations/003_add_archived_at.sql`
- Added `archived_at` TIMESTAMPTZ column to `companies` table (nullable)
- Created index for efficient filtering of non-archived deals

### 2. Type Updates
**File:** `lib/types/deal.ts`
- Added `archived_at?: string | null` to `Deal` interface

### 3. Data Access Layer
**File:** `lib/data-access/deals.ts`
- Updated `DealListFilters` to include optional `include_archived` flag
- Modified `list()` method to exclude archived deals by default (unless `include_archived: true`)
- Modified `getById()` to exclude archived deals (throws NotFoundError if archived)
- Added `getByIdIncludingArchived()` method for accessing archived deals when needed
- Added `archive(dealId)` method to soft-delete deals
- Added `delete(dealId, force)` method for permanent deletion with safety checks:
  - Only allows deletion if deal is already archived OR `force=true`
  - Related data (deal_activities, deal_chat_messages) deleted via CASCADE

### 4. API Routes
**File:** `app/api/deals/[id]/archive/route.ts`
- POST endpoint to archive a deal
- Workspace-scoped authorization
- Returns success/error response

**File:** `app/api/deals/[id]/delete/route.ts`
- POST endpoint to permanently delete a deal
- Requires `force: true` and `confirmation: "DELETE"` if deal is not archived
- Workspace-scoped authorization
- Returns success/error response

### 5. UI Components
**File:** `components/deal/MoreActionsMenu.tsx`
- New dropdown menu component (⋯) with:
  - Archive deal option (shown when not archived)
  - Delete permanently option (always shown, styled as danger)
- Handles click-outside-to-close behavior

**File:** `components/ui/DealCard.tsx`
- Added `MoreActionsMenu` to each deal card
- Added `archived_at` to Deal type
- Implemented `handleArchive()` and `handleDelete()` with API calls
- Removed old delete button (replaced by menu)
- Shows confirmation dialogs:
  - Archive: simple confirmation
  - Delete (not archived): requires typing "DELETE"
  - Delete (archived): simple confirmation

**File:** `app/deals/[id]/components/DealHeader.tsx`
- Added `MoreActionsMenu` to deal detail header
- Implemented `handleArchive()` and `handleDelete()` with API calls
- Redirects to dashboard after archive/delete

### 6. Query Updates
**File:** `app/(dashboard)/dashboard/page.tsx`
- Updated `loadDeals()` to exclude archived deals

**File:** `app/(dashboard)/today/hooks/useTodayData.ts`
- Updated all 4 queries to exclude archived deals:
  - Follow-ups needed
  - Stuck deals
  - Proceed without action
  - Recent activity (company names)

**File:** `app/deals/[id]/hooks/useDealData.ts`
- Left unchanged - allows viewing archived deals on detail page (they're just hidden from lists)

## Safety Features

1. **Archive as Default**: Archive is the primary removal action (soft delete)
2. **Permanent Delete Protection**:
   - Only allowed if deal is already archived OR user types "DELETE" confirmation
   - Strong confirmation required for non-archived deals
3. **Workspace Scoping**: All operations are workspace-scoped via `DealsRepository`
4. **Referential Integrity**: Related tables (deal_activities, deal_chat_messages) use CASCADE deletion
5. **Hidden by Default**: Archived deals are excluded from all default queries

## User Experience

- **Archive**: Simple one-click action from menu
- **Delete**: 
  - If archived: Simple confirmation dialog
  - If not archived: Requires typing "DELETE" to confirm
- **Menu Location**: 
  - Top-right of each deal card in lists
  - Top-right of deal detail header
- **Visual Feedback**: Menu closes after action, page refreshes or redirects

## SQL Migration Required

Run the migration file:
```sql
-- migrations/003_add_archived_at.sql
```

This adds the `archived_at` column and creates the necessary index.

## Testing Checklist

- [ ] Archive a deal from deal card - should disappear from lists
- [ ] Archive a deal from detail page - should redirect to dashboard
- [ ] Try to delete non-archived deal - should require "DELETE" confirmation
- [ ] Delete archived deal - should work with simple confirmation
- [ ] Verify archived deals don't appear in dashboard lists
- [ ] Verify archived deals don't appear in today page
- [ ] Verify archived deals can still be viewed on detail page (if navigated to directly)
- [ ] Verify workspace scoping (users can only archive/delete their own deals)

## Notes

- Archived deals are hidden from all default queries but can still be accessed via `getByIdIncludingArchived()` if needed
- The "Show archived" toggle mentioned in requirements was skipped for minimal implementation (can be added later if needed)
- All operations maintain workspace scoping for security
- Related data (activities, chat messages) are deleted via CASCADE when a deal is permanently deleted
