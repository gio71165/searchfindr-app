// app/api/cron/reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { constantTimeCompare } from '@/lib/api/security';
import { logger } from '@/lib/utils/logger';
import { sendEmail, formatReminderEmail } from '@/lib/utils/email';

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
    // Also get user email for each deal's workspace
    const { data: deals, error } = await supabaseAdmin
      .from('companies')
      .select('id, workspace_id, company_name, next_action, next_action_date, user_id')
      .lte('next_action_date', today)
      .is('reminded_at', null)
      .not('next_action_date', 'is', null)
      .not('stage', 'eq', 'passed');

    if (error) {
      logger.error('Error fetching reminders:', error);
      throw error;
    }

    logger.info(`Found ${deals?.length || 0} reminders due`);

    // Get workspace members to find user emails
    const workspaceIds = [...new Set((deals || []).map(d => d.workspace_id))];
    const workspaceUsers: Record<string, string[]> = {}; // workspace_id -> user_ids
    
    for (const wsId of workspaceIds) {
      const { data: members } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('workspace_id', wsId);
      
      if (members) {
        workspaceUsers[wsId] = members.map(m => m.id);
      }
    }

    const reminded: string[] = [];

    // Mark as reminded and send emails
    for (const deal of deals || []) {
      try {
        // Mark as reminded
        const { error: updateError } = await supabaseAdmin
          .from('companies')
          .update({ reminded_at: new Date().toISOString() })
          .eq('id', deal.id);

        if (updateError) {
          logger.error(`Error updating reminder for deal ${deal.id}:`, updateError);
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

        // Send email notification to all workspace members
        try {
          const userIds = workspaceUsers[deal.workspace_id] || [];
          const emailsSent: string[] = [];
          
          for (const userId of userIds) {
            try {
              const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
              const userEmail = userData?.user?.email;
              
              if (userEmail && !emailsSent.includes(userEmail)) {
                const emailHtml = formatReminderEmail(
                  deal.company_name || 'Untitled Deal',
                  deal.next_action,
                  deal.next_action_date
                );
                
                const sent = await sendEmail({
                  to: userEmail,
                  subject: `Reminder: ${deal.company_name || 'Deal'} - ${deal.next_action || 'Follow up'}`,
                  html: emailHtml,
                });
                
                if (sent) {
                  emailsSent.push(userEmail);
                  logger.info(`Sent reminder email for deal ${deal.id} to ${userEmail}`);
                }
              }
            } catch (userError) {
              // Skip individual user errors, continue with others
              logger.warn(`Failed to get user ${userId} for deal ${deal.id}:`, userError);
            }
          }
        } catch (emailError) {
          // Log but don't fail the reminder - email is optional
          logger.warn(`Failed to send emails for deal ${deal.id}:`, emailError);
        }
      } catch (err) {
        logger.error(`Error processing reminder for deal ${deal.id}:`, err);
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
