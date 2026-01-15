/**
 * Sanitizes text for use in AI prompts to prevent prompt injection attacks.
 * Escapes special characters and limits length.
 */
export function sanitizeForPrompt(text: string, maxLength: number = 10000): string {
  if (!text) return '';
  return text
    .slice(0, maxLength)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Sanitizes short text inputs (like company names, titles) for safe use.
 * Removes special characters and limits length.
 */
export function sanitizeShortText(text: string, maxLength: number = 200): string {
  if (!text) return '';
  return text
    .slice(0, maxLength)
    .replace(/[^\w\s\-.,&]/g, '')
    .trim();
}
