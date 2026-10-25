import pino from 'pino';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createContext } from './context.js';
import { createDatabase, runMigrations } from './db/client.js';
import { registerJobs } from './jobs/index.js';
import { InlineQueue, PgBossQueue, type JobQueue } from './jobs/queue.js';
import { createStorage } from './storage/index.js';
import { VERSION } from './version.js';

export { buildApp } from './app.js';
export type { ServerPlugin, PluginHost } from './plugins/api.js';

async function main() {
  const config = loadConfig();
  const log = pino({
    level: config.LOG_LEVEL,
    redact: ['req.headers.authorization', '*.accessToken', '*.refreshToken', '*.loginKey', '*.token'],
  });
  log.info({ version: VERSION }, 'starting datascratch server');

  const database = createDatabase(config.DATABASE_URL, config.DATABASE_POOL_MAX);
  if (config.DB_MIGRATE_ON_START) {
    await runMigrations(database.pool);
    log.info('database migrations applied');
  }

  const storage = await createStorage(config);
  await storage.check();

  const jobs: JobQueue = config.JOBS_ENABLED
    ? await PgBossQueue.start(config.DATABASE_URL, log)
    : new InlineQueue(log);

  const ctx = createContext({ config, log, database, storage, jobs });
  await registerJobs(ctx);
  const app = await buildApp(ctx);
  await app.listen({ host: config.HOST, port: config.PORT });

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    log.info({ signal }, 'shutting down');
    const force = setTimeout(() => process.exit(1), 15_000);
    force.unref();
    try {
      await app.close();
      await jobs.stop();
      await database.close();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

const isEntry = import.meta.url === `file://${process.argv[1]}`;
if (isEntry) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
