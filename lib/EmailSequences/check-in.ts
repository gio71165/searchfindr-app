/**
 * Email 3: Check-in
 * Sent Day 5 if no CIM upload
 * Subject: Should I cancel your trial?
 */

interface CheckInEmailProps {
  userName?: string;
  cancelTrialUrl: string;
  unsubscribeUrl: string;
  supportEmail?: string;
}

export function getCheckInEmailSubject(): string {
  return 'Should I cancel your trial?';
}

export function getCheckInEmailHtml({
  userName,
  cancelTrialUrl,
  unsubscribeUrl,
  supportEmail = 'support@searchfindr.app',
}: CheckInEmailProps): string {
  const greeting = userName ? `Hey ${userName},` : 'Hey,';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Should I cancel your trial?</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6; color: #334155;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">🤔 Check-in</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #334155;">
                ${greeting} I noticed you haven't used the tool yet.
              </p>
              
              <p style="margin: 0 0 20px; font-size: 16px; color: #334155;">
                If you're not seeing enough deal flow to justify the subscription, I don't want you to pay for something you aren't using. You can cancel here, or if you need help finding deals to analyze, reply to this email and I'll send you my favorite broker list.
              </p>
              
              <!-- Cancel Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${cancelTrialUrl}" 
                       style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
                      Cancel Trial
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; font-size: 16px; color: #334155;">
                Or, if you want to give it a shot, just reply to this email and I'll help you get started. No pressure either way.
              </p>
              
              <p style="margin: 20px 0 0; font-size: 14px; color: #64748b;">
                <a href="mailto:${supportEmail}?subject=Help getting started with SearchFindr" style="color: #3b82f6; text-decoration: underline;">Reply to this email</a> for help finding deals or getting started.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 12px; font-size: 12px; color: #64748b; text-align: center;">
                <a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a>
                <span style="color: #cbd5e1; margin: 0 8px;">•</span>
                <a href="${cancelTrialUrl}" style="color: #64748b; text-decoration: underline;">Cancel Trial</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                SearchFindr • Deal Velocity Starts Here
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
