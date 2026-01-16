// KIS Type Definitions

export type KISEnvironment = 'production' | 'mock';

export interface KISAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: Date;
}

export interface KISConfig {
  id?: number;
  app_key: string;
  app_secret: string;
  environment: KISEnvironment;
  created_at: Date;
  updated_at: Date;
}

export interface KISApiLog {
  id?: number;
  request_id: string;
  endpoint: string;
  method: string;
  request_headers: string;
  request_body: string;
  response_status: number;
  response_body: string;
  created_at: Date;
}

export interface KISApiEndpoints {
  tokenIssue: string;
  tokenRevoke: string;
  hashkey: string;
  websocket: string;
}

export const KIS_API_ENDPOINTS: Record<KISEnvironment, KISApiEndpoints> = {
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
