/**
 * Email Sequences for Trial Users
 * 
 * This module exports email templates for trial users who haven't uploaded a CIM yet.
 * All emails focus on "Deal Velocity" with a helpful, peer-to-peer tone.
 */

export { 
  getQuickStartEmailSubject, 
  getQuickStartEmailHtml 
} from './quick-start';

export { 
  getAnalystEdgeEmailSubject, 
  getAnalystEdgeEmailHtml 
} from './analyst-edge';

export { 
  getCheckInEmailSubject, 
  getCheckInEmailHtml 
} from './check-in';

/**
 * Helper function to generate email URLs with proper base URL
 */
export function getEmailUrls(userId: string, baseUrl?: string): {
  uploadUrl: string;
  analyzeUrl: string;
  cancelTrialUrl: string;
  unsubscribeUrl: string;
} {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://app.searchfindr.app';
  
  return {
    uploadUrl: `${appUrl}/dashboard`,
    analyzeUrl: `${appUrl}/dashboard`,
    cancelTrialUrl: `${appUrl}/settings?action=cancel-trial`,
    unsubscribeUrl: `${appUrl}/settings?action=unsubscribe&userId=${userId}`,
  };
}
