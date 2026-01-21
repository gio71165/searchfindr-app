/**
 * Email utility for sending notifications
 * Uses Resend API (https://resend.com) - free tier: 100 emails/day
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Email not sent.');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from || 'SearchFindr <notifications@searchfindr.app>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export function formatReminderEmail(dealName: string, nextAction: string | null, nextActionDate: string | null): string {
  const actionText = nextAction || 'Follow up on this deal';
  const dateText = nextActionDate ? new Date(nextActionDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'today';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Reminder</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-top: 0;">You have a reminder for:</p>
          <h2 style="color: #1e293b; margin: 20px 0; font-size: 20px;">${dealName}</h2>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-weight: 600; color: #475569;">Action:</p>
            <p style="margin: 5px 0 0 0; color: #64748b;">${actionText}</p>
            <p style="margin: 15px 0 0 0; font-weight: 600; color: #475569;">Due:</p>
            <p style="margin: 5px 0 0 0; color: #64748b;">${dateText}</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.searchfindr.app'}/deals" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
            View Deal →
          </a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          This is an automated reminder from SearchFindr
        </p>
      </body>
    </html>
  `;
}
