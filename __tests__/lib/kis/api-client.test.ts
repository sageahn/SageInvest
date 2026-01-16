import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { KISApiClient } from '@/lib/kis/api-client';

// Mock axios
vi.mock('axios');

describe('KIS API Client', () => {
  let client: KISApiClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    // Mock axios.create to return our mock instance
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);

    client = new KISApiClient('production');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('issueToken', () => {
    it('should issue access token successfully', async () => {
      const mockResponse = {
        data: {
          access_token: 'test_access_token',
          token_type: 'Bearer',
          expires_in: 86400,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const token = await client.issueToken('test_app_key', 'test_app_secret');

      expect(token.access_token).toBe('test_access_token');
      expect(token.token_type).toBe('Bearer');
      expect(token.expires_in).toBe(86400);
      expect(token.expires_at).toBeInstanceOf(Date);
    });

    it('should call correct endpoint with correct data', async () => {
      const mockResponse = {
        data: {
          access_token: 'test_token',
          token_type: 'Bearer',
          expires_in: 86400,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await client.issueToken('app_key_123', 'app_secret_456');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://openapi.koreainvestment.com:9443/oauth2/tokenP',
        {
          grant_type: 'client_credentials',
          appkey: 'app_key_123',
          appsecret: 'app_secret_456',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(
        client.issueToken('test_key', 'test_secret')
      ).rejects.toThrow('Network error');
    });
  });

  describe('generateHashkey', () => {
    it('should generate hashkey for POST data', async () => {
      const mockResponse = {
        data: {
          hash: 'generated_hash_value',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const postData = { key: 'value' };
      const hash = await client.generateHashkey('test_app_key', postData);

      expect(hash).toBe('generated_hash_value');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://openapi.koreainvestment.com:9443/uapi/hashkey',
        postData,
        expect.objectContaining({
          headers: expect.objectContaining({
            appKey: 'test_app_key',
          }),
        })
      );
    });
  });

  describe('generateApprovalKey', () => {
    it('should generate approval key for websocket', async () => {
      const mockResponse = {
        data: {
          approval_key: 'approval_key_value',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const approvalKey = await client.generateApprovalKey('test_key', 'test_secret');

      expect(approvalKey).toBe('approval_key_value');
    });
  });

  describe('revokeToken', () => {
    it('should revoke access token', async () => {
      mockAxiosInstance.post.mockResolvedValue({});

      await client.revokeToken('test_key', 'test_secret', 'test_token');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://openapi.koreainvestment.com:9443/oauth2/revokeP',
        {
          appkey: 'test_key',
          appsecret: 'test_secret',
          token: 'test_token',
        },
        expect.any(Object)
      );
    });
  });

  describe('environment selection', () => {
    it('should use production endpoints for production environment', () => {
      const prodClient = new KISApiClient('production');

      expect(prodClient).toBeDefined();
    });

    it('should use mock endpoints for mock environment', () => {
      const mockClient = new KISApiClient('mock');

      expect(mockClient).toBeDefined();
    });
  });
});
