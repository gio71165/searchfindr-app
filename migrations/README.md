# Database Migrations

This directory contains SQL migration files for the SearchFindr database schema.

## Running Migrations

1. **Open Supabase Dashboard**: Navigate to your Supabase project
2. **Go to SQL Editor**: Click on "SQL Editor" in the left sidebar
3. **Create New Query**: Click "New Query"
4. **Copy & Paste**: Copy the entire contents of the migration file you want to run
5. **Execute**: Click "Run" to execute the SQL

## Current Migrations

### `001_add_deal_state_tracking.sql`
Adds deal state tracking functionality:
- Adds verdict, stage, and action tracking columns to `companies` table
- Creates `deal_activities` table for activity logging
- Sets up automatic stage change logging via trigger
- Configures RLS policies for activity table

**Important**: This migration assumes the `workspace_members` table exists. If it doesn't, you may need to adjust the RLS policies.
