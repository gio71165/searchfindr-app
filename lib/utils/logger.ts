/**
 * Centralized logging utility for production-safe logging.
 * - Info/warn logs only appear in development
 * - Error logs always appear (for production error tracking)
 * - Automatically sanitizes sensitive data (API keys, tokens, passwords, etc.)
 */
const isDev = process.env.NODE_ENV === 'development';

/**
 * Sanitizes log data to prevent sensitive information leakage.
 * Removes or masks API keys, tokens, passwords, and other secrets.
 */
function sanitizeLogData(data: unknown): unknown {
  if (typeof data === 'string') {
    // Mask API keys (sf_ prefix)
    if (data.startsWith('sf_')) {
      return data.substring(0, 8) + '***REDACTED***';
    }
    // Mask bearer tokens
    if (data.startsWith('Bearer ')) {
      return 'Bearer ***REDACTED***';
    }
    // Mask potential secrets (long random strings)
    if (data.length > 32 && /^[a-zA-Z0-9_-]+$/.test(data)) {
      return data.substring(0, 8) + '***REDACTED***';
    }
    // Check for common secret patterns
    const secretPatterns = [
      /api[_-]?key/i,
      /token/i,
      /password/i,
      /secret/i,
      /credential/i,
      /auth[_-]?token/i,
      /access[_-]?token/i,
    ];
    for (const pattern of secretPatterns) {
      if (pattern.test(data)) {
        return '***REDACTED***';
      }
    }
    return data;
  }

  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(sanitizeLogData);
    }
    
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = [
      'apiKey', 'api_key', 'token', 'password', 'secret', 'credential',
      'authorization', 'auth', 'access_token', 'refresh_token',
      'service_role_key', 'anon_key', 'supabase_key',
    ];
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }

  return data;
}

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) {
      const sanitized = args.map(sanitizeLogData);
      console.log('[INFO]', ...sanitized);
    }
  },
  error: (...args: unknown[]) => {
    const sanitized = args.map(sanitizeLogData);
    console.error('[ERROR]', ...sanitized);
    // TODO: Send to error tracking service (Sentry, etc)
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      const sanitized = args.map(sanitizeLogData);
      console.warn('[WARN]', ...sanitized);
    }
  },
};
