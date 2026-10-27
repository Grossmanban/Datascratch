import {
  bigint,
  bigserial,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/** Raw bytes; all encrypted payloads are stored as bytea. */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const created = () => ts('created_at').notNull().defaultNow();

export const docKind = pgEnum('doc_kind', ['account', 'notebook', 'note']);
export const notebookMode = pgEnum('notebook_mode', ['private', 'agent']);
export const shareKind = pgEnum('share_kind', ['note', 'notebook']);
export const sharePermission = pgEnum('share_permission', ['view', 'edit']);
export const agentPermission = pgEnum('agent_permission', ['read', 'read_write']);

export interface KdfParams {
  alg: 'argon2id13';
  ops: number;
  mem: number;
}

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  salt: bytea('salt').notNull(),
  kdf: jsonb('kdf').$type<KdfParams>().notNull(),
  /** Argon2id(loginKey) in PHC string format. */
  loginHash: text('login_hash').notNull(),
  /** Argon2id(recoveryLoginKey) in PHC string format. */
  recoveryHash: text('recovery_hash').notNull(),
  wrappedMasterKeyPassword: bytea('wrapped_master_key_password').notNull(),
  wrappedMasterKeyRecovery: bytea('wrapped_master_key_recovery').notNull(),
  accountDocId: uuid('account_doc_id').notNull(),
  /** Bytes stored for this account (updates, snapshots, attachments); kept by triggers (0004). */
  storageBytes: bigint('storage_bytes', { mode: 'number' }).notNull().default(0),
  createdAt: created(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

/** A device is one logged-in session (one refresh token family). */
export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: created(),
    lastSeenAt: ts('last_seen_at').notNull().defaultNow(),
    revokedAt: ts('revoked_at'),
    /** Why the device was revoked (user | password_change | recovery | token_reuse): clients wipe local data on it. */
    revokedReason: text('revoked_reason'),
  },
  (t) => [index('devices_user_idx').on(t.userId)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey(),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    /** SHA-256 of the token. */
    tokenHash: bytea('token_hash').notNull(),
    expiresAt: ts('expires_at').notNull(),
    /** Set when the token was exchanged; presenting it again means it leaked. */
    usedAt: ts('used_at'),
    createdAt: created(),
  },
  (t) => [uniqueIndex('refresh_tokens_hash_idx').on(t.tokenHash), index('refresh_tokens_device_idx').on(t.deviceId)],
);

export const recoveryTokens = pgTable('recovery_tokens', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: bytea('token_hash').notNull().unique(),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
  createdAt: created(),
});

export const notebooks = pgTable(
  'notebooks',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mode: notebookMode('mode').notNull(),
    /** notebookKey wrapped by the user's masterKey (opaque to the server). */
    wrappedKey: bytea('wrapped_key').notNull(),
    /** notebookKey wrapped by DS_KMS_KEY; present only in agent mode. */
    serverWrappedKey: bytea('server_wrapped_key'),
    createdAt: created(),
  },
  (t) => [index('notebooks_user_idx').on(t.userId)],
);

export const docs = pgTable(
  'docs',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: docKind('kind').notNull(),
    notebookId: uuid('notebook_id').references(() => notebooks.id, { onDelete: 'cascade' }),
    /** Last assigned seq; incremented under a row lock on every accepted update. */
    lastSeq: bigint('last_seq', { mode: 'number' }).notNull().default(0),
    /** baseSeq of the newest snapshot, 0 if none. */
    snapshotSeq: bigint('snapshot_seq', { mode: 'number' }).notNull().default(0),
    /** Number of updates and bytes accepted since the newest snapshot (compaction hints). */
    updatesSinceSnapshot: integer('updates_since_snapshot').notNull().default(0),
    bytesSinceSnapshot: bigint('bytes_since_snapshot', { mode: 'number' }).notNull().default(0),
    createdAt: created(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [index('docs_user_idx').on(t.userId), index('docs_notebook_idx').on(t.notebookId)],
);

export const docUpdates = pgTable(
  'doc_updates',
  {
    docId: uuid('doc_id')
      .notNull()
      .references(() => docs.id, { onDelete: 'cascade' }),
    seq: bigint('seq', { mode: 'number' }).notNull(),
    payload: bytea('payload').notNull(),
    deviceId: text('device_id').notNull(),
    clientMsgId: text('client_msg_id'),
    createdAt: created(),
  },
  (t) => [
    primaryKey({ columns: [t.docId, t.seq] }),
    uniqueIndex('doc_updates_client_msg_idx').on(t.docId, t.deviceId, t.clientMsgId),
  ],
);

export const docSnapshots = pgTable(
  'doc_snapshots',
  {
    docId: uuid('doc_id')
      .notNull()
      .references(() => docs.id, { onDelete: 'cascade' }),
    /** baseSeq: the snapshot contains every update with seq <= this. */
    seq: bigint('seq', { mode: 'number' }).notNull(),
    payload: bytea('payload').notNull(),
    deviceId: text('device_id').notNull(),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.docId, t.seq] })],
);

export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    noteId: uuid('note_id')
      .notNull()
      .references(() => docs.id, { onDelete: 'cascade' }),
    size: bigint('size', { mode: 'number' }).notNull(),
    chunkCount: integer('chunk_count').notNull(),
    mime: text('mime').notNull(),
    createdAt: created(),
    completedAt: ts('completed_at'),
  },
  (t) => [index('attachments_user_idx').on(t.userId), index('attachments_note_idx').on(t.noteId)],
);

export const attachmentChunks = pgTable(
  'attachment_chunks',
  {
    attachmentId: uuid('attachment_id')
      .notNull()
      .references(() => attachments.id, { onDelete: 'cascade' }),
    index: integer('index').notNull(),
    size: integer('size').notNull(),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.attachmentId, t.index] })],
);

/** Storage keys awaiting deletion (blobs are removed by the cleanup job, after the DB rows are gone). */
export const storageTrash = pgTable('storage_trash', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  key: text('key').notNull(),
  createdAt: created(),
});

export const shares = pgTable(
  'shares',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetKind: shareKind('target_kind').notNull(),
    targetId: uuid('target_id').notNull(),
    permission: sharePermission('permission').notNull(),
    expiresAt: ts('expires_at'),
    revokedAt: ts('revoked_at'),
    createdAt: created(),
  },
  (t) => [index('shares_user_idx').on(t.userId)],
);

// ---------------------------------------------------------------------------
// Agents (@datascratch/agents, AgentsStore). Ids and hashes are plugin-defined
// strings; secrets are stored only as SHA-256 hex.
// ---------------------------------------------------------------------------

/** What the user allowed an agent to do: a static token or an OAuth authorization. */
export const agentGrants = pgTable(
  'agent_grants',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<'static' | 'oauth'>().notNull(),
    name: text('name').notNull(),
    clientId: text('client_id'),
    notebookIds: uuid('notebook_ids').array().notNull(),
    permission: agentPermission('permission').notNull(),
    createdAt: ts('created_at').notNull(),
    expiresAt: ts('expires_at'),
    revokedAt: ts('revoked_at'),
    lastUsedAt: ts('last_used_at'),
    secretHash: text('secret_hash').unique(),
  },
  (t) => [index('agent_grants_user_idx').on(t.userId)],
);

export const oauthClients = pgTable('oauth_clients', {
  clientId: text('client_id').primaryKey(),
  clientSecretHash: text('client_secret_hash'),
  clientName: text('client_name').notNull(),
  clientUri: text('client_uri'),
  logoUri: text('logo_uri'),
  redirectUris: text('redirect_uris').array().notNull(),
  tokenEndpointAuthMethod: text('token_endpoint_auth_method')
    .$type<'none' | 'client_secret_post' | 'client_secret_basic'>()
    .notNull(),
  registration: text('registration').$type<'dcr' | 'cimd'>().notNull(),
  createdAt: ts('created_at').notNull(),
});

export const oauthCodes = pgTable('oauth_codes', {
  codeHash: text('code_hash').primaryKey(),
  clientId: text('client_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  redirectUri: text('redirect_uri').notNull(),
  codeChallenge: text('code_challenge').notNull(),
  resource: text('resource').notNull(),
  scope: text('scope').notNull(),
  notebookIds: uuid('notebook_ids').array().notNull(),
  permission: agentPermission('permission').notNull(),
  expiresAt: ts('expires_at').notNull(),
});

export const oauthTokens = pgTable(
  'oauth_tokens',
  {
    tokenHash: text('token_hash').primaryKey(),
    kind: text('kind').$type<'access' | 'refresh' | 'refresh_used'>().notNull(),
    grantId: text('grant_id')
      .notNull()
      .references(() => agentGrants.id, { onDelete: 'cascade' }),
    clientId: text('client_id').notNull(),
    scope: text('scope').notNull(),
    resource: text('resource').notNull(),
    expiresAt: ts('expires_at').notNull(),
  },
  (t) => [index('oauth_tokens_grant_idx').on(t.grantId)],
);

export const agentAudit = pgTable(
  'agent_audit',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id')
      .notNull()
      .references(() => agentGrants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    at: ts('at').notNull(),
    via: text('via').$type<'mcp' | 'rest'>().notNull(),
    action: text('action').notNull(),
    notebookId: uuid('notebook_id'),
    noteId: uuid('note_id'),
    ok: boolean('ok').notNull(),
    errorCode: text('error_code'),
    durationMs: integer('duration_ms').notNull(),
  },
  (t) => [index('agent_audit_grant_idx').on(t.grantId, t.at)],
);

export const securityEventKind = pgEnum('security_event_kind', [
  'password_changed',
  'recovery_used',
  'recovery_key_rotated',
]);

/** Account security journal (what changed, when, from which device). */
export const securityEvents = pgTable(
  'security_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: securityEventKind('kind').notNull(),
    /** Device the change was made from (null if it no longer exists or for recovery). */
    deviceId: uuid('device_id'),
    deviceName: text('device_name'),
    at: ts('at').notNull().defaultNow(),
  },
  (t) => [index('security_events_user_idx').on(t.userId, t.id)],
);
