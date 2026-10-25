import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import * as schema from './schema.js';

export type Db = NodePgDatabase<typeof schema>;
/** A transaction handle; has the same query API as Db. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbOrTx = Db | Tx;

export interface Database {
  pool: pg.Pool;
  db: Db;
  close(): Promise<void>;
}

export function createDatabase(url: string, max = 10): Database {
  const pool = new pg.Pool({ connectionString: url, max });
  const db = drizzle(pool, { schema });
  return { pool, db, close: () => pool.end() };
}

export const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

export async function runMigrations(pool: pg.Pool): Promise<void> {
  // Serialize concurrent migrators (several test workers or a restart loop).
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(724100001)');
    await migrate(drizzle(client, { schema }), { migrationsFolder });
  } finally {
    await client.query('SELECT pg_advisory_unlock(724100001)').catch(() => undefined);
    client.release();
  }
}

/**
 * Run `fn` with the database restricted to what the given agent token may see
 * (PostgreSQL Row-Level Security, D-30). Use for every query made on behalf of
 * an agent, in addition to the permission checks in code.
 */
export async function withAgentScope<T>(db: Db, tokenId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE ds_agent`);
    await tx.execute(sql`SELECT set_config('ds.agent_token_id', ${tokenId}, true)`);
    return fn(tx);
  });
}
