// KIS Configuration Repository
import { query } from '@/lib/db';
import { encrypt, decrypt } from './crypto';
import type { KISConfig, KISEnvironment } from './types';

export class ConfigRepository {
  /**
   * Save KIS API configuration
   */
  async saveConfig(appKey: string, appSecret: string, environment: KISEnvironment): Promise<void> {
    const encryptedSecret = encrypt(appSecret);

    const existing = await this.getConfig();

    if (existing) {
      await query(
        `UPDATE kis_configs
         SET app_key = $1, app_secret_encrypted = $2, environment = $3
         WHERE id = $4`,
        [appKey, encryptedSecret, environment, existing.id]
      );
    } else {
      await query(
        `INSERT INTO kis_configs (app_key, app_secret_encrypted, environment)
         VALUES ($1, $2, $3)`,
        [appKey, encryptedSecret, environment]
      );
    }
  }

  /**
   * Get KIS configuration
   */
  async getConfig(): Promise<KISConfig | null> {
    const result = await query(
      `SELECT id, app_key, app_secret_encrypted, environment, created_at, updated_at
       FROM kis_configs
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      app_key: row.app_key,
      app_secret: decrypt(row.app_secret_encrypted),
      environment: row.environment,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  /**
   * Delete KIS configuration
   */
  async deleteConfig(): Promise<void> {
    await query(`DELETE FROM kis_configs`);
  }

  /**
   * Check if configuration exists
   */
  async hasConfig(): Promise<boolean> {
    const result = await query(`SELECT COUNT(*) as count FROM kis_configs`);
    return parseInt(result.rows[0].count) > 0;
  }
}

export const configRepository = new ConfigRepository();
