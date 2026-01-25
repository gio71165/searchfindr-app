/**
 * Email 1: Quick Start
 * Sent 2 hours after signup if no CIM upload
 * Subject: One click is all it takes
 */

interface QuickStartEmailProps {
  userName?: string;
  uploadUrl: string;
  unsubscribeUrl: string;
  cancelTrialUrl: string;
}

export function getQuickStartEmailSubject(): string {
  return 'One click is all it takes';
}

export function getQuickStartEmailHtml({
  userName,
  uploadUrl,
  unsubscribeUrl,
  cancelTrialUrl,
}: QuickStartEmailProps): string {
  const greeting = userName ? `Hey ${userName},` : 'Hey,';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>One click is all it takes</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6; color: #334155;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">⚡ Quick Start</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #334155;">
                ${greeting} saw you haven't uploaded a CIM yet.
              </p>
              
              <p style="margin: 0 0 20px; font-size: 16px; color: #334155;">
                If you're waiting for the 'perfect' deal, don't. Upload a mediocre one just to see how SearchFindr flags the issues. It's better to practice on a bad deal than to be slow on a great one.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${uploadUrl}" 
                       style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
                      Upload your first CIM
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; font-size: 14px; color: #64748b; font-style: italic;">
                Deal velocity starts with the first upload. Every minute you wait is a minute your competition isn't.
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
