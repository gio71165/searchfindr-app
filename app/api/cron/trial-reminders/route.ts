// app/api/cron/trial-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { constantTimeCompare } from '@/lib/api/security';
import { logger } from '@/lib/utils/logger';
import { sendEmail, formatTrialEmail } from '@/lib/utils/email';

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
      logger.warn('trial-reminders cron: Invalid cron secret attempted');
      return json(401, { error: 'Unauthorized.' });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Find users on Day 1, Day 4, or Day 6 of their trial
    // Day 1: trial_start_date = today
    // Day 4: trial_start_date = 3 days ago
    // Day 6: trial_start_date = 5 days ago (trial ends tomorrow)
    
    const day1Date = todayStr;
    const day4Date = new Date(today);
    day4Date.setDate(today.getDate() - 3);
    const day4DateStr = day4Date.toISOString().split('T')[0];
    
    const day6Date = new Date(today);
    day6Date.setDate(today.getDate() - 5);
    const day6DateStr = day6Date.toISOString().split('T')[0];

    // Get users who started trial on Day 1, Day 4, or Day 6
    const { data: day1Users, error: day1Error } = await supabaseAdmin
      .from('profiles')
      .select('id, subscription_tier, subscription_plan, trial_start_date')
      .eq('subscription_status', 'trialing')
      .gte('trial_start_date', day1Date)
      .lt('trial_start_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const { data: day4Users, error: day4Error } = await supabaseAdmin
      .from('profiles')
      .select('id, subscription_tier, subscription_plan, trial_start_date')
      .eq('subscription_status', 'trialing')
      .gte('trial_start_date', day4DateStr)
      .lt('trial_start_date', new Date(new Date(day4DateStr).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const { data: day6Users, error: day6Error } = await supabaseAdmin
      .from('profiles')
      .select('id, subscription_tier, subscription_plan, trial_start_date')
      .eq('subscription_status', 'trialing')
      .gte('trial_start_date', day6DateStr)
      .lt('trial_start_date', new Date(new Date(day6DateStr).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (day1Error || day4Error || day6Error) {
      logger.error('Error fetching trial users:', { day1Error, day4Error, day6Error });
      throw day1Error || day4Error || day6Error;
    }

    const sent: string[] = [];
    const errors: string[] = [];

    // Send Day 1 emails
    for (const profile of day1Users || []) {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        const userEmail = userData?.user?.email;
        const userName = userData?.user?.user_metadata?.name || null;
        
        if (!userEmail) {
          logger.warn(`No email found for user ${profile.id}`);
          continue;
        }

        const planName = profile.subscription_tier === 'search_fund' 
          ? 'Traditional Search Fund ($149/mo)'
          : 'Self-Funded Searcher ($49/mo)';

        const emailHtml = formatTrialEmail(1, userName, planName);
        
        const emailSent = await sendEmail({
          to: userEmail,
          subject: 'Welcome to SearchFindr! Here\'s how to upload your first CIM',
          html: emailHtml,
        });

        if (emailSent) {
          sent.push(`Day 1: ${userEmail}`);
          logger.info(`Sent Day 1 trial email to ${userEmail}`);
        } else {
          errors.push(`Day 1: ${userEmail} - Email send failed`);
        }
      } catch (err) {
        logger.error(`Error sending Day 1 email to user ${profile.id}:`, err);
        errors.push(`Day 1: ${profile.id} - ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Send Day 4 emails
    for (const profile of day4Users || []) {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        const userEmail = userData?.user?.email;
        const userName = userData?.user?.user_metadata?.name || null;
        
        if (!userEmail) {
          logger.warn(`No email found for user ${profile.id}`);
          continue;
        }

        const planName = profile.subscription_tier === 'search_fund' 
          ? 'Traditional Search Fund ($149/mo)'
          : 'Self-Funded Searcher ($49/mo)';

        const emailHtml = formatTrialEmail(4, userName, planName);
        
        const emailSent = await sendEmail({
          to: userEmail,
          subject: 'Did you see the SBA calculator yet? Here\'s a 2-min video on how it works',
          html: emailHtml,
        });

        if (emailSent) {
          sent.push(`Day 4: ${userEmail}`);
          logger.info(`Sent Day 4 trial email to ${userEmail}`);
        } else {
          errors.push(`Day 4: ${userEmail} - Email send failed`);
        }
      } catch (err) {
        logger.error(`Error sending Day 4 email to user ${profile.id}:`, err);
        errors.push(`Day 4: ${profile.id} - ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Send Day 6 emails
    for (const profile of day6Users || []) {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        const userEmail = userData?.user?.email;
        const userName = userData?.user?.user_metadata?.name || null;
        
        if (!userEmail) {
          logger.warn(`No email found for user ${profile.id}`);
          continue;
        }

        const planName = profile.subscription_tier === 'search_fund' 
          ? 'Traditional Search Fund ($149/mo)'
          : 'Self-Funded Searcher ($49/mo)';

        const emailHtml = formatTrialEmail(6, userName, planName);
        
        const emailSent = await sendEmail({
          to: userEmail,
          subject: 'Your trial ends tomorrow. Here\'s how to cancel if you need to',
          html: emailHtml,
        });

        if (emailSent) {
          sent.push(`Day 6: ${userEmail}`);
          logger.info(`Sent Day 6 trial email to ${userEmail}`);
        } else {
          errors.push(`Day 6: ${userEmail} - Email send failed`);
        }
      } catch (err) {
        logger.error(`Error sending Day 6 email to user ${profile.id}:`, err);
        errors.push(`Day 6: ${profile.id} - ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return json(200, {
      ok: true,
      ran_at: new Date().toISOString(),
      sent: sent.length,
      errors: errors.length,
      details: {
        sent,
        errors,
      },
    });
  } catch (e: any) {
    logger.error('trial-reminders cron error:', e);
    return json(500, { ok: false, error: e.message || "Internal server error" });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
