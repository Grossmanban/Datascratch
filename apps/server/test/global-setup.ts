import pg from 'pg';
import { runMigrations } from '../src/db/client.js';

export const TEMPLATE_DB = 'ds_test_template';

export function adminUrl(): string {
  return process.env.TEST_DATABASE_URL ?? 'postgres://ds:ds@localhost:5432/ds_test';
}

export function withDatabase(url: string, name: string): string {
  const u = new URL(url);
  u.pathname = `/${name}`;
  return u.toString();
}

/** Build a migrated template database once; each test file clones it. */
export default async function setup() {
  const admin = new pg.Client({ connectionString: adminUrl() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEMPLATE_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEMPLATE_DB}`);
  await admin.end();
  const pool = new pg.Pool({ connectionString: withDatabase(adminUrl(), TEMPLATE_DB), max: 1 });
  await runMigrations(pool);
  await pool.end();
}
