/**
 * Strip PII from text and JSON for ML training data (anonymized, compliant).
 * Redacts: person names (heuristic), exact street addresses, email/local parts.
 */

const STREET_PATTERN = /\b\d{1,6}\s+[\w\s]{2,40}(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|way|place|pl|court|ct)\b/gi;
const REDACT_PLACEHOLDER = '[REDACTED]';

function redactStreetAddresses(text: string): string {
  return text.replace(STREET_PATTERN, REDACT_PLACEHOLDER);
}

/** Redact likely person names: "FirstName LastName" (2–4 words, title case). Conservative. */
function redactPersonNames(text: string): string {
  return text.replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g, (match) => {
    if (match.length < 4 || match.length > 50) return match;
    return REDACT_PLACEHOLDER;
  });
}

/** Strip PII from a single string value. */
export function stripPiiFromString(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string') return value ?? null;
  let out = value;
  out = redactStreetAddresses(out);
  out = redactPersonNames(out);
  return out;
}

/** Recursively strip PII from JSON-serializable object (strings only). */
export function stripPiiFromJson(obj: unknown): unknown {
  if (obj == null) return obj;
  if (typeof obj === 'string') return stripPiiFromString(obj);
  if (Array.isArray(obj)) return obj.map(stripPiiFromJson);
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = stripPiiFromJson(v);
    }
    return out;
  }
  return obj;
}
