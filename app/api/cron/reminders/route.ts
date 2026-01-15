// app/api/cron/reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { constantTimeCompare } from '@/lib/api/security';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const CRON_SECRET = process.env.CRON_SECRET as string;

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

// This runs daily via Vercel Cron
export async function GET(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, {
        error: 'Missing Supabase env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      });
    }
    if (!CRON_SECRET) {
      return json(500, { error: 'Missing CRON_SECRET env var.' });
    }

    // Verify cron secret to prevent unauthorized calls (constant-time comparison)
    const secret = request.headers.get('x-cron-secret');
    if (!secret || !CRON_SECRET || !constantTimeCompare(secret, CRON_SECRET)) {
      logger.warn('reminders cron: Invalid cron secret attempted');
      return json(401, { error: 'Unauthorized.' });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const today = new Date().toISOString().split('T')[0];

    // Find deals with reminders due today that haven't been reminded yet
    const { data: deals, error } = await supabaseAdmin
      .from('companies')
      .select('id, workspace_id, company_name, next_action, next_action_date')
      .lte('next_action_date', today)
      .is('reminded_at', null)
      .not('next_action_date', 'is', null)
      .not('stage', 'eq', 'passed');

    if (error) {
      console.error('Error fetching reminders:', error);
      throw error;
    }

    console.log(`Found ${deals?.length || 0} reminders due`);

    const reminded: string[] = [];

    // Mark as reminded (in production, you'd also send email/notification here)
    for (const deal of deals || []) {
      try {
        // Mark as reminded
        const { error: updateError } = await supabaseAdmin
          .from('companies')
          .update({ reminded_at: new Date().toISOString() })
          .eq('id', deal.id);

        if (updateError) {
          console.error(`Error updating reminder for deal ${deal.id}:`, updateError);
          continue;
        }

        // Log activity
        await supabaseAdmin
          .from('deal_activities')
          .insert({
            workspace_id: deal.workspace_id,
            deal_id: deal.id,
            activity_type: 'reminder_triggered',
            description: `Reminder: ${deal.next_action || 'Follow up'}`,
            metadata: {
              reminder_date: deal.next_action_date,
              action: deal.next_action,
            },
          });

        reminded.push(deal.id);

        // TODO: Send email notification or in-app notification here
        // For now, they'll see it in the "Today" view
      } catch (err) {
        console.error(`Error processing reminder for deal ${deal.id}:`, err);
      }
    }

    return json(200, {
      ok: true,
      ran_at: new Date().toISOString(),
      reminded: reminded.length,
      deals: reminded,
    });
  } catch (e: any) {
    logger.error('reminders cron error:', e);
    return json(500, { ok: false, error: "Internal server error" });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
