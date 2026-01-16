// KIS API Client
import axios, { AxiosInstance } from 'axios';
import type { KISAuthToken, KISConfig, KISEnvironment, KISApiEndpoints } from './types';

export interface TokenIssueResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface HashkeyResponse {
  hash: string;
}

export interface ApprovalKeyResponse {
  approval_key: string;
}

export class KISApiClient {
  private axiosInstance: AxiosInstance;
  private endpoints: KISApiEndpoints;

  constructor(environment: KISEnvironment) {
    this.endpoints = this.getEndpoints(environment);
    this.axiosInstance = axios.create({
      baseURL: this.endpoints.tokenIssue.replace('/oauth2/tokenP', ''),
      timeout: 10000,
    });
  }

  private getEndpoints(environment: KISEnvironment): KISApiEndpoints {
    const endpoints: Record<KISEnvironment, KISApiEndpoints> = {
      production: {
        tokenIssue: 'https://openapi.koreainvestment.com:9443/oauth2/tokenP',
        tokenRevoke: 'https://openapi.koreainvestment.com:9443/oauth2/revokeP',
        hashkey: 'https://openapi.koreainvestment.com:9443/uapi/hashkey',
        websocket: 'https://openapi.koreainvestment.com:9443/oauth2/Approval',
      },
      mock: {
        tokenIssue: 'https://openapivts.koreainvestment.com:29443/oauth2/tokenP',
        tokenRevoke: 'https://openapivts.koreainvestment.com:29443/oauth2/revokeP',
        hashkey: 'https://openapivts.koreainvestment.com:29443/uapi/hashkey',
        websocket: 'https://openapivts.koreainvestment.com:29443/oauth2/Approval',
      },
    };

    return endpoints[environment];
  }

  /**
   * Issue access token
   */
  async issueToken(appKey: string, appSecret: string): Promise<KISAuthToken> {
    const response = await this.axiosInstance.post<TokenIssueResponse>(
      this.endpoints.tokenIssue,
      {
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expires_at: expiresAt,
    };
  }

  /**
   * Revoke access token
   */
  async revokeToken(appKey: string, appSecret: string, accessToken: string): Promise<void> {
    await this.axiosInstance.post(
      this.endpoints.tokenRevoke,
      {
        appkey: appKey,
        appsecret: appSecret,
        token: accessToken,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Generate hashkey for POST requests
   */
  async generateHashkey(appKey: string, postData: any): Promise<string> {
    const response = await this.axiosInstance.post<HashkeyResponse>(
      this.endpoints.hashkey,
      postData,
      {
        headers: {
          'Content-Type': 'application/json',
          'appKey': appKey,
        },
      }
    );

    return response.data.hash;
  }

  /**
   * Generate approval key for websocket
   */
  async generateApprovalKey(appKey: string, appSecret: string): Promise<string> {
    const response = await this.axiosInstance.post<ApprovalKeyResponse>(
      this.endpoints.websocket,
      {
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.approval_key;
  }
}
