// KIS API Logger
import { query } from '@/lib/db';

export interface ApiLogRequest {
  request_id: string;
  endpoint: string;
  method: string;
  request_headers: string;
  request_body: string;
}

export interface ApiLogResponse {
  request_id: string;
  response_status: number;
  response_body: string;
  error_message?: string;
}

export class KISLogger {
  /**
   * Log API request
   */
  async logRequest(data: ApiLogRequest): Promise<void> {
    try {
      const sanitizedHeaders = this.sanitizeData(data.request_headers);
      const sanitizedBody = this.sanitizeData(data.request_body);

      await query(
        `INSERT INTO kis_api_logs (request_id, endpoint, method, request_headers, request_body)
         VALUES ($1, $2, $3, $4, $5)`,
        [data.request_id, data.endpoint, data.method, sanitizedHeaders, sanitizedBody]
      );
    } catch (error) {
      console.error('Failed to log API request:', error);
      // Don't throw - logging failures should not break API calls
    }
  }

  /**
   * Log API response
   */
  async logResponse(data: ApiLogResponse): Promise<void> {
    try {
      const sanitizedBody = this.sanitizeData(data.response_body);

      await query(
        `UPDATE kis_api_logs
         SET response_status = $1, response_body = $2, error_message = $3
         WHERE request_id = $4`,
        [data.response_status, sanitizedBody, data.error_message || null, data.request_id]
      );
    } catch (error) {
      console.error('Failed to log API response:', error);
      // Don't throw - logging failures should not break API calls
    }
  }

  /**
   * Sanitize sensitive information from logs
   */
  private sanitizeData(data: string): string {
    try {
      const parsed = JSON.parse(data);
      this.redactSensitiveFields(parsed);
      return JSON.stringify(parsed);
    } catch {
      // If not JSON, return as-is but redact common patterns
      return data
        .replace(/"appsecret":\s*"[^"]+"/g, '"appsecret":"***"')
        .replace(/"app_secret":\s*"[^"]+"/g, '"app_secret":"***"')
        .replace(/"authorization":\s*"Bearer\s[^"]+"/g, '"authorization":"Bearer ***"')
        .replace(/"access_token":\s*"[^"]+"/g, '"access_token":"***"')
        .replace(/"token":\s*"[^"]+"/g, '"token":"***"');
    }
  }

  /**
   * Recursively redact sensitive fields from object
   */
  private redactSensitiveFields(obj: any): void {
    const sensitiveKeys = [
      'appsecret',
      'app_secret',
      'authorization',
      'access_token',
      'token',
      'password',
      'api_secret',
    ];

    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveKeys.includes(lowerKey)) {
        obj[key] = '***';
      } else if (typeof obj[key] === 'object') {
        this.redactSensitiveFields(obj[key]);
      }
    }
  }

  /**
   * Get recent API logs
   */
  async getRecentLogs(limit: number = 100): Promise<any[]> {
    const result = await query(
      `SELECT id, request_id, endpoint, method, response_status,
              created_at, error_message
       FROM kis_api_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Get log statistics
   */
  async getLogStats(): Promise<{
    total: number;
    successful: number;
    failed: number;
    avgResponseTime?: number;
  }> {
    const result = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 300) as successful,
        COUNT(*) FILTER (WHERE response_status >= 400) as failed
      FROM kis_api_logs
    `);

    return result.rows[0];
  }
}

export const logger = new KISLogger();
