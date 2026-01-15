/**
 * Centralized logging utility for production-safe logging.
 * - Info/warn logs only appear in development
 * - Error logs always appear (for production error tracking)
 */
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) console.log('[INFO]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
    // TODO: Send to error tracking service (Sentry, etc)
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn('[WARN]', ...args);
  },
};
