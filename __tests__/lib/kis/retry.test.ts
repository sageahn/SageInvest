import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff, calculateRetryDelay, isRetryableError } from '@/lib/kis/retry';

describe('Retry Policy', () => {
  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should respect maxRetries limit', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(retryWithBackoff(mockFn, { maxRetries: 2 })).rejects.toThrow('Always fails');

      expect(mockFn).toHaveBeenCalledTimes(3); // Initial attempt + 2 retries
    });

    it('should use exponential backoff delay', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const start = Date.now();
      await retryWithBackoff(mockFn, {
        maxRetries: 3,
        baseDelay: 100,
      });
      const duration = Date.now() - start;

      // Should have delays: 100ms + 200ms = 300ms minimum
      expect(duration).toBeGreaterThanOrEqual(300);
    });

    it('should not retry non-retryable errors', async () => {
      const mockFn = vi.fn().mockRejectedValue({
        response: {
          status: 400, // Bad Request - not retryable
        },
      });

      await expect(
        retryWithBackoff(mockFn, {
          maxRetries: 3,
          shouldRetry: () => false,
        })
      ).rejects.toMatchObject({
        response: { status: 400 },
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry network errors', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error')) // No response property
        .mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, { maxRetries: 2 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry 5xx errors', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, { maxRetries: 2 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry 429 rate limit errors', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, { maxRetries: 2 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff', () => {
      expect(calculateRetryDelay(0, 1000, 16000)).toBeLessThan(2000);
      expect(calculateRetryDelay(1, 1000, 16000)).toBeLessThan(3000);
      expect(calculateRetryDelay(2, 1000, 16000)).toBeLessThan(5000);
    });

    it('should respect maxDelay limit', () => {
      const delay = calculateRetryDelay(10, 1000, 16000);
      expect(delay).toBeLessThanOrEqual(16000);
    });

    it('should add jitter to prevent thundering herd', () => {
      const delay1 = calculateRetryDelay(1, 1000, 16000);
      const delay2 = calculateRetryDelay(1, 1000, 16000);

      // With random jitter, delays should be different
      expect(delay1).not.toBe(delay2);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for network errors', () => {
      const error = new Error('Network error');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 408 Request Timeout', () => {
      expect(isRetryableError({ response: { status: 408 } })).toBe(true);
    });

    it('should return true for 429 Too Many Requests', () => {
      expect(isRetryableError({ response: { status: 429 } })).toBe(true);
    });

    it('should return true for 500 Internal Server Error', () => {
      expect(isRetryableError({ response: { status: 500 } })).toBe(true);
    });

    it('should return true for 502 Bad Gateway', () => {
      expect(isRetryableError({ response: { status: 502 } })).toBe(true);
    });

    it('should return true for 503 Service Unavailable', () => {
      expect(isRetryableError({ response: { status: 503 } })).toBe(true);
    });

    it('should return true for 504 Gateway Timeout', () => {
      expect(isRetryableError({ response: { status: 504 } })).toBe(true);
    });

    it('should return false for 400 Bad Request', () => {
      expect(isRetryableError({ response: { status: 400 } })).toBe(false);
    });

    it('should return false for 401 Unauthorized', () => {
      expect(isRetryableError({ response: { status: 401 } })).toBe(false);
    });

    it('should return false for 404 Not Found', () => {
      expect(isRetryableError({ response: { status: 404 } })).toBe(false);
    });
  });
});
