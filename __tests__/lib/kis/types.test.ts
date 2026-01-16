import { describe, it, expect } from 'vitest';
import { KISAuthToken, KISConfig, KISEnvironment, KISApiLog } from '@/lib/kis/types';

describe('KIS Types', () => {
  describe('KISAuthToken', () => {
    it('should create valid auth token type', () => {
      const token: KISAuthToken = {
        access_token: 'test_token',
        token_type: 'Bearer',
        expires_in: 86400,
        expires_at: new Date(Date.now() + 86400 * 1000),
      };

      expect(token.access_token).toBeDefined();
      expect(token.token_type).toBe('Bearer');
      expect(token.expires_in).toBeGreaterThan(0);
      expect(token.expires_at).toBeInstanceOf(Date);
    });

    it('should validate token expiration', () => {
      const expiredToken: KISAuthToken = {
        access_token: 'expired_token',
        token_type: 'Bearer',
        expires_in: 86400,
        expires_at: new Date(Date.now() - 1000),
      };

      expect(expiredToken.expires_at < new Date()).toBe(true);
    });
  });

  describe('KISConfig', () => {
    it('should create valid config type', () => {
      const config: KISConfig = {
        app_key: 'a'.repeat(36),
        app_secret: 'b'.repeat(180),
        environment: 'production' as KISEnvironment,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(config.app_key).toHaveLength(36);
      expect(config.app_secret).toHaveLength(180);
      expect(config.environment).toBe('production');
    });
  });

  describe('KISApiLog', () => {
    it('should create valid API log type', () => {
      const log: KISApiLog = {
        id: 1,
        request_id: 'req-123',
        endpoint: '/oauth2/tokenP',
        method: 'POST',
        request_headers: '{}',
        request_body: '{}',
        response_status: 200,
        response_body: '{}',
        created_at: new Date(),
      };

      expect(log.request_id).toBeDefined();
      expect(log.endpoint).toBeDefined();
      expect(log.method).toBe('POST');
      expect(log.response_status).toBe(200);
    });
  });
});
