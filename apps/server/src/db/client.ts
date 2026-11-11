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

/**
 * Limits on every connection of the pool, so that no request can wait on the database forever:
 * a statement, a wait for a lock, a transaction left open by the application (milliseconds, 0: off).
 */
export interface DbTimeouts {
  statementMs: number;
  lockMs: number;
  idleInTransactionMs: number;
  /** Waiting for a pool connection, a new one included (pg waits forever by default). */
  connectMs?: number;
}

export const DEFAULT_DB_TIMEOUTS: DbTimeouts = {
  statementMs: 120_000,
  lockMs: 30_000,
  idleInTransactionMs: 120_000,
  connectMs: 15_000,
};

export function createDatabase(url: string, max = 10, timeouts: DbTimeouts = DEFAULT_DB_TIMEOUTS): Database {
  const options = [
    `-c statement_timeout=${timeouts.statementMs}`,
    `-c lock_timeout=${timeouts.lockMs}`,
    `-c idle_in_transaction_session_timeout=${timeouts.idleInTransactionMs}`,
  ].join(' ');
  const pool = new pg.Pool({
    connectionString: url,
    max,
    options,
    connectionTimeoutMillis: timeouts.connectMs ?? DEFAULT_DB_TIMEOUTS.connectMs!,
    // Idle connections stay alive through quiet periods instead of being dropped by the network.
    keepAlive: true,
  });
  const db = drizzle(pool, { schema });
  return { pool, db, close: () => pool.end() };
}

export const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

export async function runMigrations(pool: pg.Pool): Promise<void> {
  // Serialize concurrent migrators (several test workers or a restart loop).
  const client = await pool.connect();
  try {
    // Migrations may legitimately run long (indexes on big tables): no limits on this session.
    await client.query('SET statement_timeout = 0; SET lock_timeout = 0; SET idle_in_transaction_session_timeout = 0');
    await client.query('SELECT pg_advisory_lock(724100001)');
    await migrate(drizzle(client, { schema }), { migrationsFolder });
    // Roles are cluster-wide and not part of a dump: make sure the agent role and
    // our membership exist even after restoring a backup into a fresh cluster.
    await client.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ds_agent') THEN CREATE ROLE ds_agent NOLOGIN; END IF;
    END $$`);
    await client.query('GRANT ds_agent TO CURRENT_USER');
  } finally {
    await client.query('SELECT pg_advisory_unlock(724100001)').catch(() => undefined);
    // Back to the pool's limits before the connection serves requests.
    await client.query('RESET statement_timeout; RESET lock_timeout; RESET idle_in_transaction_session_timeout').catch(() => undefined);
    client.release();
  }
}

export interface AgentScope {
  userId: string;
  /** When set, access is narrowed to this grant's notebooks and permission. */
  grantId?: string | undefined;
}

/**
 * Run `fn` with the database restricted to what an agent may see (PostgreSQL
 * Row-Level Security, D-30): agent-mode notebooks of the user, narrowed to the
 * grant's notebooks when a grant is given. Use for every query made on behalf
 * of an agent, in addition to the permission checks in code.
 */
export async function withAgentScope<T>(db: Db, scope: AgentScope, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE ds_agent`);
    await tx.execute(sql`SELECT set_config('ds.agent_user_id', ${scope.userId}, true)`);
    await tx.execute(sql`SELECT set_config('ds.agent_grant_id', ${scope.grantId ?? ''}, true)`);
    return fn(tx);
  });
}
