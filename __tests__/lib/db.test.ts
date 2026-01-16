import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool, query, getClient } from '@/lib/db';

describe('Database Connection', () => {
  beforeAll(async () => {
    // Setup test database connection
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/sageinvest_test';
  });

  afterAll(async () => {
    // Cleanup
    await pool.end();
  });

  it('should create database pool', () => {
    expect(pool).toBeDefined();
    expect(pool.totalCount).toBeGreaterThanOrEqual(0);
  });

  it('should execute simple query', async () => {
    const result = await query('SELECT 1 as value');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].value).toBe(1);
  });

  it('should get database client', async () => {
    const client = await getClient();
    expect(client).toBeDefined();
    expect(client.query).toBeDefined();
    await client.release();
  });

  it('should handle connection errors gracefully', async () => {
    // Test with invalid connection string
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:9999/test';

    await expect(query('SELECT 1')).rejects.toThrow();

    process.env.DATABASE_URL = originalUrl;
  });
});
