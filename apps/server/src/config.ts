import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const base64urlKey = z
  .string()
  .regex(/^[A-Za-z0-9_-]+$/, 'must be base64url without padding')
  .refine((v) => Buffer.from(v, 'base64url').length === 32, 'must decode to 32 bytes');

const ConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().positive().default(8080),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** Public base URL of the server, used in OpenAPI and links. */
    PUBLIC_URL: z.string().url().default('http://localhost:8080'),
    /** Web app URL (links from server pages, e.g. the agents consent screen). */
    APP_URL: z.string().url().optional(),
    /** Comma-separated list of allowed CORS origins (web client). Empty = same origin only. */
    CORS_ORIGINS: z.string().default(''),
    /** Advertise OAuth Client ID Metadata Documents to MCP clients; off when the server cannot reach their hosts. */
    OAUTH_CLIENT_METADATA_DOCUMENTS: bool.default(true),

    DATABASE_URL: z.string().min(1),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    /** Run migrations automatically on startup. */
    DB_MIGRATE_ON_START: bool.default(true),

    /** Secret for signing access/guest JWTs and deriving the fake prelogin salt (base64url, 32 bytes). */
    DS_JWT_SECRET: base64urlKey,
    /** Server key wrapping notebook keys for agent-mode notebooks (crypto.md §8). Never stored in the DB. */
    DS_KMS_KEY: base64urlKey,

    ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(15 * 60),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    /** A used refresh token presented again within this window returns the same new token (lost response). */
    REFRESH_REUSE_GRACE_SEC: z.coerce.number().int().nonnegative().default(60),

    STORAGE_DRIVER: z.enum(['disk', 's3']).default('disk'),
    STORAGE_DIR: z.string().default('./data/files'),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default('auto'),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PREFIX: z.string().default(''),
    S3_FORCE_PATH_STYLE: bool.default(true),

    ATTACHMENT_MAX_BYTES: z.coerce.number().int().positive().default(200 * 1024 * 1024),
    SYNC_UPDATE_MAX_BYTES: z.coerce.number().int().positive().default(2 * 1024 * 1024),
    SYNC_SNAPSHOT_MAX_BYTES: z.coerce.number().int().positive().default(50 * 1024 * 1024),
    SYNC_AWARENESS_MAX_BYTES: z.coerce.number().int().positive().default(64 * 1024),
    /** Messages per second allowed per WebSocket connection (token bucket, burst = 5x). */
    SYNC_RATE_PER_SEC: z.coerce.number().positive().default(100),

    /** History retention (see docs/spec/10-sync.md). */
    HISTORY_KEEP_ALL_DAYS: z.coerce.number().int().nonnegative().default(7),
    HISTORY_DAILY_DAYS: z.coerce.number().int().nonnegative().default(30),
    HISTORY_WEEKLY_DAYS: z.coerce.number().int().nonnegative().default(365),
    /** Updates covered by a snapshot are kept this long so lagging devices can catch up incrementally. */
    COVERED_UPDATES_KEEP_DAYS: z.coerce.number().int().nonnegative().default(7),

    JOBS_ENABLED: bool.default(true),
    /** Enables GET /metrics (Prometheus) for requests with `Authorization: Bearer <METRICS_TOKEN>`. */
    METRICS_TOKEN: z.string().min(16).optional(),
  })
  .superRefine((c, ctx) => {
    if (c.STORAGE_DRIVER === 's3' && !c.S3_BUCKET) {
      ctx.addIssue({ code: 'custom', path: ['S3_BUCKET'], message: 'required when STORAGE_DRIVER=s3' });
    }
  });

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // `KEY=` in an .env file means "not set".
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== ''));
  const parsed = ConfigSchema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid server configuration:\n${issues}`);
  }
  return parsed.data;
}
