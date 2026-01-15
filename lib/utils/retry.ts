/**
 * Retry utility for handling transient API failures gracefully.
 * Automatically retries failed requests with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 2, delayMs = 1000, backoff = true } = options;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Don't retry on auth errors or client errors
      if (lastError.message.includes('401') || lastError.message.includes('400')) {
        throw lastError;
      }
      
      if (attempt < maxRetries) {
        const delay = backoff ? delayMs * (attempt + 1) : delayMs;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
