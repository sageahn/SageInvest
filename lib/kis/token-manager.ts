// KIS Token Manager - Auto Refresh Mechanism
import { tokenRepository } from './token-repository';
import { configRepository } from './config-repository';
import { KISApiClient } from './api-client';
import type { KISAuthToken, KISEnvironment } from './types';

export class TokenManager {
  private refreshPromise: Promise<KISAuthToken> | null = null;
  private apiClient: KISApiClient;

  constructor(environment: KISEnvironment) {
    this.apiClient = new KISApiClient(environment);
  }

  /**
   * Get valid token, refresh if needed
   */
  async getValidToken(): Promise<KISAuthToken> {
    const config = await configRepository.getConfig();
    if (!config) {
      throw new Error('KIS configuration not found. Please configure API credentials first.');
    }

    const token = await tokenRepository.getToken(config.environment);

    // Check if token exists and is valid (not expiring within 1 hour)
    if (token) {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      if (token.expires_at > oneHourFromNow) {
        return token;
      }
    }

    // Token is expired or missing, refresh it
    return this.refreshToken();
  }

  /**
   * Refresh access token with race condition prevention
   */
  async refreshToken(): Promise<KISAuthToken> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start new refresh
    this.refreshPromise = this.performRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform actual token refresh
   */
  private async performRefresh(): Promise<KISAuthToken> {
    const config = await configRepository.getConfig();
    if (!config) {
      throw new Error('KIS configuration not found');
    }

    const token = await this.apiClient.issueToken(config.app_key, config.app_secret);
    await tokenRepository.saveToken(token, config.environment);

    return token;
  }

  /**
   * Manually force token refresh
   */
  async forceRefresh(): Promise<KISAuthToken> {
    return this.refreshToken();
  }

  /**
   * Check if token is expired or will expire soon
   */
  async isTokenExpiringSoon(): Promise<boolean> {
    const config = await configRepository.getConfig();
    if (!config) {
      return true;
    }

    return tokenRepository.isTokenExpired(config.environment);
  }

  /**
   * Revoke current token
   */
  async revokeToken(): Promise<void> {
    const config = await configRepository.getConfig();
    if (!config) {
      return;
    }

    const token = await tokenRepository.getToken(config.environment);

    if (token) {
      await this.apiClient.revokeToken(config.app_key, config.app_secret, token.access_token);
      await tokenRepository.deleteToken(config.environment);
    }
  }
}
