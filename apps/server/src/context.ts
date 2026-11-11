import type { Logger } from 'pino';
import { TokenSigner } from './auth/tokens.js';
import type { Config } from './config.js';
import type { Database } from './db/client.js';
import type { JobQueue } from './jobs/queue.js';
import { fromB64 } from './lib/encoding.js';
import { ChangeLog } from './services/change-log.js';
import { DocumentService } from './services/documents.js';
import { ImageFetcher } from './services/image-fetch.js';
import { KeyService } from './services/keys.js';
import { Metrics } from './metrics.js';
import type { BlobStorage } from './storage/index.js';
import { MemoryBroadcaster, type Broadcaster } from './sync/hub.js';

/** Everything a request handler, job or plugin needs. Built once per process. */
export interface AppContext {
  config: Config;
  log: Logger;
  database: Database;
  storage: BlobStorage;
  hub: Broadcaster;
  jobs: JobQueue;
  tokens: TokenSigner;
  documents: DocumentService;
  /** Change-log positions for sync protocol 3 (`resume`). */
  changes: ChangeLog;
  keys: KeyService;
  metrics: Metrics;
  imageFetcher: ImageFetcher;
}

export function createContext(opts: {
  config: Config;
  log: Logger;
  database: Database;
  storage: BlobStorage;
  jobs: JobQueue;
  hub?: Broadcaster;
}): AppContext {
  const { config } = opts;
  const hub = opts.hub ?? new MemoryBroadcaster();
  const changes = new ChangeLog(opts.database.db);
  return {
    ...opts,
    hub,
    changes,
    tokens: new TokenSigner(fromB64(config.DS_JWT_SECRET), config.ACCESS_TOKEN_TTL_SEC),
    documents: new DocumentService(
      hub,
      {
        keepAllDays: config.HISTORY_KEEP_ALL_DAYS,
        dailyDays: config.HISTORY_DAILY_DAYS,
        weeklyDays: config.HISTORY_WEEKLY_DAYS,
        coveredUpdatesKeepDays: config.COVERED_UPDATES_KEEP_DAYS,
      },
      config.USER_STORAGE_QUOTA_BYTES,
      changes,
    ),
    keys: new KeyService(fromB64(config.DS_KMS_KEY)),
    metrics: new Metrics(),
    imageFetcher: new ImageFetcher({ maxBytes: config.FETCH_IMAGE_MAX_BYTES, timeoutMs: config.FETCH_IMAGE_TIMEOUT_MS }),
  };
}
