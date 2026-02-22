// Retry Policy with Exponential Backoff
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3, // Reduced from 5 to 3 for faster failure
    baseDelay = 1000, // 1 second
    maxDelay = 8000, // Reduced from 16s to 8s
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error) || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      console.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
        JSON.stringify(error) || 'Unknown error'
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Default retry condition - retry on network errors and 5xx only
 * Do NOT retry on client errors (4xx) except 408 and 429
 */
function defaultShouldRetry(error: any): boolean {
  // Do not retry on client authentication/authorization errors
  const nonRetryableStatusCodes = [
    400, // Bad Request - client error
    401, // Unauthorized - token expired (handled by middleware)
    403, // Forbidden - permission denied
    404, // Not Found
    422, // Unprocessable Entity
  ];

  if (nonRetryableStatusCodes.includes(error.response?.status)) {
    return false;
  }

  // Network errors (no response) - be conservative, don't retry indefinitely
  if (!error.response) {
    // Only retry network errors if it's a timeout or connection issue
    // Don't retry on DNS errors or other fatal network issues
    const isNetworkRetryable =
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND';
    return isNetworkRetryable;
  }

  // HTTP status codes to retry
  const retryableStatusCodes = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ];

  return retryableStatusCodes.includes(error.response?.status);
}

/**
 * Calculate retry delay with jitter
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 16000
): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  // Retryable HTTP status codes
  const retryableStatusCodes = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ];

  return retryableStatusCodes.includes(error.response?.status);
}
