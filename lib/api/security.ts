// lib/api/security.ts
// Security utility functions for path validation, URL validation, and CORS

/**
 * Validates storage paths to prevent path traversal attacks
 * Rejects paths containing .., backslashes, double slashes, or absolute paths
 * @param path - The storage path to validate
 * @returns true if path is safe, false otherwise
 */
export function validateStoragePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Reject path traversal attempts
  if (path.includes('..') || path.includes('\\') || path.includes('//') || path.startsWith('/')) {
    return false;
  }

  // Reject control characters
  if (/[\x00-\x1f\x7f]/.test(path)) {
    return false;
  }

  // Path should be reasonable length (adjust based on your storage structure)
  if (path.length > 500) {
    return false;
  }

  // Allow alphanumeric, hyphens, underscores, slashes (single), dots (but not ..)
  // This pattern allows UUID-based paths like: "workspace-id/deal-id/filename.pdf"
  const safePathPattern = /^[a-zA-Z0-9_\-./]+$/;
  if (!safePathPattern.test(path)) {
    return false;
  }

  return true;
}

/**
 * Validates URLs to prevent SSRF attacks
 * @param urlStr - The URL string to validate
 * @returns true if URL is safe to fetch, false otherwise
 */
export function validateUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(urlStr);

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and loopback
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return false;
    }

    // Block private IP ranges
    // 10.0.0.0/8
    if (/^10\./.test(hostname)) {
      return false;
    }
    // 192.168.0.0/16
    if (/^192\.168\./.test(hostname)) {
      return false;
    }
    // 172.16.0.0/12
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) {
      return false;
    }

    // Block cloud metadata endpoints
    const blockedHosts = [
      'metadata.google.internal',
      '169.254.169.254', // AWS/GCP metadata
      'metadata.azure.com',
      'metadata.cloud.ovh.net',
      '169.254.169.254', // DigitalOcean
    ];

    if (blockedHosts.some(blocked => hostname.includes(blocked))) {
      return false;
    }

    // Block local/private domain patterns
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Gets CORS headers based on environment
 * Centralizes CORS configuration
 */
export function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = process.env.ALLOWED_ORIGINS?.split(',')[0]?.trim() || 
    (process.env.NODE_ENV === 'production'
      ? 'https://searchfindr-app.vercel.app'
      : 'http://localhost:3000');

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Validates input length
 * @param value - The value to validate
 * @param maxLength - Maximum allowed length
 * @param fieldName - Name of the field for error messages
 * @returns Error message if invalid, null if valid
 */
export function validateInputLength(value: string, maxLength: number, fieldName: string): string | null {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  if (value.length > maxLength) {
    return `${fieldName} exceeds maximum length of ${maxLength} characters`;
  }
  return null;
}
