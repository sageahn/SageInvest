// PostgreSQL Database Connection
import { Pool, PoolClient } from 'pg';

let poolInstance: Pool;

export function getPool(): Pool {
  if (!poolInstance) {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sageinvest';
    poolInstance = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return poolInstance;
}

// Export pool singleton getter
export const pool = {
  get totalCount() {
    return getPool().totalCount;
  },
  get idleCount() {
    return getPool().idleCount;
  },
  get waitingCount() {
    return getPool().waitingCount;
  },
  end: () => getPool().end(),
  connect: () => getPool().connect(),
  query: (text: string, params?: any[]) => getPool().query(text, params),
};

export async function query(text: string, params?: any[]): Promise<any> {
  const pool = getPool();
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  const client = await pool.connect();
  return client;
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
