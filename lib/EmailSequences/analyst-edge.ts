/**
 * Email 2: Analyst's Edge
 * Sent Day 3 if no CIM upload
 * Subject: What page 30 is hiding from you...
 */

interface AnalystEdgeEmailProps {
  userName?: string;
  analyzeUrl: string;
  unsubscribeUrl: string;
  cancelTrialUrl: string;
}

export function getAnalystEdgeEmailSubject(): string {
  return 'What page 30 is hiding from you...';
}

export function getAnalystEdgeEmailHtml({
  userName,
  analyzeUrl,
  unsubscribeUrl,
  cancelTrialUrl,
}: AnalystEdgeEmailProps): string {
  const greeting = userName ? `Hey ${userName},` : 'Hey,';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>What page 30 is hiding from you...</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6; color: #334155;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">🔍 Analyst's Edge</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #334155;">
                ${greeting}
              </p>
              
              <p style="margin: 0 0 20px; font-size: 16px; color: #334155;">
                Most brokers bury the 'Add-back' skeletons on page 30+. SearchFindr finds them in 60 seconds.
              </p>
              
              <p style="margin: 0 0 20px; font-size: 16px; color: #334155;">
                If you're still reading PDFs manually, you're losing 15 hours this week. Send me a link to a listing you're looking at, and I'll show you how to vet it.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${analyzeUrl}" 
                       style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
                      Analyze a Deal
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; font-size: 14px; color: #64748b; font-style: italic;">
                The best deals go fast. Speed wins. Every hour you spend manually reading CIMs is an hour your competition isn't.
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
