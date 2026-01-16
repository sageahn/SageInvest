// KIS Token Repository
import { query } from '@/lib/db';
import type { KISAuthToken, KISEnvironment } from './types';

export interface TokenRow {
  id?: number;
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: Date;
  environment: string;
  created_at?: Date;
  updated_at?: Date;
}

export class TokenRepository {
  /**
   * Save or update token for environment
   */
  async saveToken(token: KISAuthToken, environment: KISEnvironment): Promise<void> {
    const existingToken = await this.getToken(environment);

    if (existingToken) {
      await query(
        `UPDATE kis_tokens
         SET access_token = $1, token_type = $2, expires_in = $3, expires_at = $4
         WHERE environment = $5`,
        [token.access_token, token.token_type, token.expires_in, token.expires_at, environment]
      );
    } else {
      await query(
        `INSERT INTO kis_tokens (access_token, token_type, expires_in, expires_at, environment)
         VALUES ($1, $2, $3, $4, $5)`,
        [token.access_token, token.token_type, token.expires_in, token.expires_at, environment]
      );
    }
  }

  /**
   * Get token for environment
   */
  async getToken(environment: KISEnvironment): Promise<KISAuthToken | null> {
    const result = await query(
      `SELECT id, access_token, token_type, expires_in, expires_at, environment
       FROM kis_tokens
       WHERE environment = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [environment]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      access_token: row.access_token,
      token_type: row.token_type,
      expires_in: row.expires_in,
      expires_at: new Date(row.expires_at),
    };
  }

  /**
   * Delete token for environment
   */
  async deleteToken(environment: KISEnvironment): Promise<void> {
    await query(
      `DELETE FROM kis_tokens WHERE environment = $1`,
      [environment]
    );
  }

  /**
   * Check if token is expired or will expire soon (within 1 hour)
   */
  async isTokenExpired(environment: KISEnvironment): Promise<boolean> {
    const token = await this.getToken(environment);
    if (!token) {
      return true;
    }

    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    return token.expires_at < oneHourFromNow;
  }
}

export const tokenRepository = new TokenRepository();
