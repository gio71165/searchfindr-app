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

export function formatTrialEmail(day: 1 | 4 | 6, userName: string | null, planName: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.searchfindr.app';
  const userNameText = userName ? ` ${userName}` : '';
  
  if (day === 1) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to SearchFindr! 🎉</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-top: 0;">Hi${userNameText},</p>
            <p style="font-size: 16px;">Welcome to your 7-day free trial! You now have full access to all features.</p>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">Get Started:</h2>
              <p style="margin: 10px 0; color: #64748b;">
                <strong>1. Upload your first CIM</strong><br>
                Go to the CIMs page and upload a Confidential Information Memorandum. Our AI will analyze it in minutes.
              </p>
              <p style="margin: 10px 0; color: #64748b;">
                <strong>2. Try the SBA Calculator</strong><br>
                Check out the Deal Structure Calculator to model SBA 7(a) financing scenarios.
              </p>
            </div>
            
            <a href="${appUrl}/cims" 
               style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
              Upload Your First CIM →
            </a>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
            This is an automated email from SearchFindr
          </p>
        </body>
      </html>
    `;
  }
  
  if (day === 4) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💡 Did you see the SBA calculator yet?</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-top: 0;">Hi${userNameText},</p>
            <p style="font-size: 16px;">You're on Day 4 of your trial. Have you tried the SBA 7(a) calculator yet?</p>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">Quick 2-Minute Demo:</h2>
              <p style="margin: 10px 0; color: #64748b;">
                The SBA calculator helps you model deal structures, calculate debt service coverage, and see if a deal can support SBA financing. 
                It's one of our most powerful features for searchers.
              </p>
            </div>
            
            <a href="${appUrl}/dashboard" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
              Open Dashboard →
            </a>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
            This is an automated email from SearchFindr
          </p>
        </body>
      </html>
    `;
  }
  
  // Day 6 email
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Your trial ends tomorrow</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-top: 0;">Hi${userNameText},</p>
          <p style="font-size: 16px;">Your 7-day free trial ends tomorrow. Your subscription to <strong>${planName}</strong> will begin automatically.</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-weight: 600;">What happens next?</p>
            <p style="margin: 10px 0 0 0; color: #78350f;">
              If you've found value in SearchFindr, you're all set—your subscription will continue automatically. 
              If not, you can cancel anytime with one click in your dashboard settings.
            </p>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e293b;">To cancel (if needed):</p>
            <ol style="margin: 0; padding-left: 20px; color: #64748b;">
              <li style="margin-bottom: 8px;">Go to Settings → Subscription</li>
              <li style="margin-bottom: 8px;">Click "Cancel Subscription"</li>
              <li>Done! No charges, no questions asked.</li>
            </ol>
          </div>
          
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <a href="${appUrl}/settings" 
               style="flex: 1; display: inline-block; background: #64748b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center;">
              Manage Subscription
            </a>
            <a href="${appUrl}/dashboard" 
               style="flex: 1; display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center;">
              Continue Using SearchFindr
            </a>
          </div>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          This is an automated email from SearchFindr
        </p>
      </body>
    </html>
  `;
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
