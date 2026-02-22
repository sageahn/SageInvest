// KIS Authentication Middleware
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { TokenManager } from './token-manager';
import { logger } from './logger';

import type { KISEnvironment } from './types';

export interface KISRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  params?: any;
  data?: any;
  needsHash?: boolean;
  needsAuth?: boolean;
  trId?: string;
}

export class KISAuthMiddleware {
  private tokenManager: TokenManager;
  private axiosInstance: AxiosInstance;
  private appKey: string;
  private appSecret: string;

  constructor(environment: KISEnvironment, appKey: string, appSecret: string) {
    this.tokenManager = new TokenManager(environment);
    this.appKey = appKey;
    this.appSecret = appSecret;

    this.axiosInstance = axios.create({
      timeout: 120000, // KIS API가 느릴 수 있으므로 2분으로 증가
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth headers
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const requestId = this.generateRequestId();

        // Add request ID to headers
        config.headers['X-Request-ID'] = requestId;

        // Add authorization header if needed
        if (config.headers['needs-auth'] === 'true') {
          try {
            const token = await this.tokenManager.getValidToken();
            config.headers['Authorization'] = `Bearer ${token.access_token}`;
          } catch (error) {
            console.error('Failed to get valid token:', error);
            throw error;
          }
        }

        // Add appkey and appsecret headers (required by KIS OpenAPI)
        config.headers['appkey'] = this.appKey;
        config.headers['appsecret'] = this.appSecret;

        // Add content-type header for KIS API
        config.headers['content-type'] = 'application/json; charset=utf-8';

        // Add transaction ID header if provided
        if (config.headers['tr_id']) {
          // tr_id is already set by the request options
        }

        // Add hash header for POST requests if needed
        if (config.method === 'post' && config.headers['needs-hash'] === 'true' && config.data) {
          const { KISApiClient } = await import('./api-client');
          const client = new KISApiClient(config.headers['environment'] as any);
          const hash = await client.generateHashkey(this.appKey, config.data);
          config.headers['hash'] = hash;
        }

        // Log request (fire-and-forget for performance)
        logger.logRequest({
          request_id: requestId,
          endpoint: config.url || '',
          method: config.method?.toUpperCase() || 'GET',
          request_headers: JSON.stringify(this.sanitizeHeaders(config.headers)),
          request_body: JSON.stringify(config.data || {}),
        });

        // Remove custom headers
        delete config.headers['needs-auth'];
        delete config.headers['needs-hash'];
        delete config.headers['environment'];

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors and retries
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful response
        logger.logResponse({
          request_id: response.config.headers['X-Request-ID'] as string,
          response_status: response.status,
          response_body: JSON.stringify(response.data),
        });

        return response;
      },
      async (error: AxiosError) => {
        const requestId = error.config?.headers?.['X-Request-ID'] as string;

        // Log error response (fire-and-forget for performance)
        logger.logResponse({
          request_id: requestId,
          response_status: error.response?.status || 0,
          response_body: JSON.stringify(error.response?.data || {}),
          error_message: error.message,
        });

        // Handle 401 Unauthorized - token expired
        if (error.response?.status === 401) {
          try {
            await this.tokenManager.refreshToken();

            // Retry original request with new token
            if (error.config) {
              const newToken = await this.tokenManager.getValidToken();
              error.config.headers['Authorization'] = `Bearer ${newToken.access_token}`;
              return this.axiosInstance.request(error.config);
            }
          } catch (retryError) {
            console.error('Failed to refresh token and retry:', retryError);
            throw retryError;
          }
        }

        // Handle 429 Too Many Requests - rate limit
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] as string | undefined;
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;

          await new Promise((resolve) => setTimeout(resolve, waitTime));

          if (error.config) {
            return this.axiosInstance.request(error.config);
          }
        }

        // Throw error directly - retry is handled at the caller level if needed
        throw error;
      }
    );
  }

  /**
   * Make authenticated KIS API request
   */
  async makeRequest<T = any>(options: KISRequestOptions): Promise<AxiosResponse<T>> {
    const headers: Record<string, string> = {
      ...options.headers,
      'needs-auth': options.needsAuth !== false ? 'true' : 'false',
      'needs-hash': options.needsHash === true ? 'true' : 'false',
    };

    // Add transaction ID header if provided
    if (options.trId) {
      headers['tr_id'] = options.trId;
    }

    return this.axiosInstance.request<T>({
      method: options.method,
      url: options.url,
      headers,
      params: options.params,
      data: options.data,
    });
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'appsecret') {
        sanitized[key] = '***';
      } else if (key.toLowerCase() === 'authorization') {
        sanitized[key] = 'Bearer ***';
      } else {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }
}
