// Single entry point for @datascratch/shared (core stream). App code imports from here so
// the package's API shape is adapted in one place: the app uses async crypto helpers that
// make sure libsodium is initialised.
import {
  AD,
  decryptEnvelope,
  deriveRecoveryLoginKey,
  derivePasswordKeys as deriveSync,
  encryptEnvelope,
  formatRecoveryKey,
  initCrypto,
  moveNoteToNotebook as moveNoteSync,
  parseRecoveryKey,
  rotateRecoveryKey as rotateRecoverySync,
  unwrapKey as unwrapSync,
  wrapKey as wrapSync,
  type KdfParams,
} from "@datascratch/shared";

export {
  DEFAULT_KDF,
  FORMAT_VERSION,
  fromBase64Url,
  toBase64Url,
  uuidv7,
  type AgentPermission,
  type AgentToken,
  type ClientMessage,
  type Device,
  type DocKind,
  type DocVersion,
  type Folder,
  type KdfParams,
  type NoteKind,
  type NoteMeta,
  type Notebook,
  type NotebookMode,
  type NotebookRef,
  type NoteStyle,
  type PreloginResponse,
  type RecoveryStartResponse,
  type ServerMessage,
  type Session,
  type Share,
  type SharePermission,
  type ShareTarget,
  type IncomingInvitation,
  type Member,
  type MemberRole,
  type OutgoingInvitation,
  type SharedItem,
  MAX_MEMBERS,
  type SignupRequest,
  type Space,
  type SyncAuth as HelloAuth,
  type SyncErrorCode,
  type SecurityEvent,
  type TaskState,
  type GuestSessionResponse as GuestGrant,
  type MeResponse as Me,
  type StarredItem as StarredRef,
} from "@datascratch/shared";

/** A new recovery key and the `POST /auth/recovery-key` body (crypto.md §4). */
export async function rotateRecoveryKey(masterKey: Uint8Array, currentLoginKey: Uint8Array, userId: string) {
  await initCrypto();
  return rotateRecoverySync(masterKey, currentLoginKey, userId);
}

/** Re-wraps the note key and moves its NoteMeta between notebook indexes (api.md «Перенос заметки»). */
export async function moveNoteToNotebook(options: Parameters<typeof moveNoteSync>[0]) {
  await initCrypto();
  return moveNoteSync(options);
}

export type ApiErrorCode = import("@datascratch/shared").ApiErrorCode;
export type NoteCover = import("@datascratch/shared").NoteCover | null;
export type NoteBackdrop = import("@datascratch/shared").NoteBackdrop | null;
/** agents-api.md §8: audit rows of an agent grant, newest first. */
export type AgentAuditEntry = {
  at: string;
  via: "mcp" | "rest";
  action: string;
  notebookId: string | null;
  noteId: string | null;
  ok: boolean;
  errorCode: string | null;
  durationMs: number | null;
};
/** agents-api.md §8: static tokens and OAuth connections in one list. */
export type AgentGrant = import("@datascratch/shared").AgentToken & { kind?: "static" | "oauth"; clientId?: string | null };

export const sodiumReady = () => initCrypto();

export const ad = {
  doc: AD.doc,
  awareness: AD.awareness,
  masterPassword: AD.masterKeyPassword,
  masterRecovery: AD.masterKeyRecovery,
  notebookKey: AD.notebookKey,
  notebookServerKey: AD.notebookKeyServer,
  noteKey: AD.noteKey,
  attachmentChunk: AD.attachmentChunk,
};

export type PasswordKeys = { loginKey: Uint8Array; passwordKey: Uint8Array };

export async function derivePasswordKeys(password: string, salt: Uint8Array, kdf?: KdfParams): Promise<PasswordKeys> {
  await initCrypto();
  const { loginKey, passwordKey } = deriveSync(password, salt, kdf);
  return { loginKey, passwordKey };
}

export async function recoveryLoginKey(recoveryKey: Uint8Array): Promise<Uint8Array> {
  await initCrypto();
  return deriveRecoveryLoginKey(recoveryKey);
}

export async function seal(key: Uint8Array, plaintext: Uint8Array, adText: string): Promise<Uint8Array> {
  await initCrypto();
  return encryptEnvelope(key, plaintext, adText);
}

export async function open(key: Uint8Array, envelope: Uint8Array, adText: string): Promise<Uint8Array> {
  await initCrypto();
  return decryptEnvelope(key, envelope, adText);
}

export async function wrapKey(wrappingKey: Uint8Array, key: Uint8Array, adText: string): Promise<string> {
  await initCrypto();
  return wrapSync(wrappingKey, key, adText);
}

export async function unwrapKey(wrappingKey: Uint8Array, wrapped: string, adText: string): Promise<Uint8Array> {
  await initCrypto();
  return unwrapSync(wrappingKey, wrapped, adText);
}

// Random keys/salts use WebCrypto so they're available before libsodium loads.
export const randomKey = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));
export const randomSalt = (): Uint8Array => crypto.getRandomValues(new Uint8Array(16));

export const encodeRecoveryKey = formatRecoveryKey;
export const decodeRecoveryKey = parseRecoveryKey;
