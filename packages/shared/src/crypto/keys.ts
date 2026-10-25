// Key hierarchy (crypto.md §1): wrapping helpers with the contract's `ad`
// strings, plus whole-flow helpers for signup, login, password change and recovery.
import { AD, DEFAULT_KDF, KEY_BYTES, type KdfParams } from "../contracts/crypto.js";
import { toBase64Url } from "./base64url.js";
import {
  decryptEnvelope,
  decryptFromBase64Url,
  encryptEnvelope,
  encryptToBase64Url,
  type EncryptOptions,
} from "./envelope.js";
import { CryptoError } from "./errors.js";
import { derivePasswordKeys, deriveRecoveryLoginKey, generateSalt } from "./kdf.js";
import { formatRecoveryKey, generateRecoveryKey } from "./recovery.js";
import { sodium } from "./sodium.js";

/** A fresh random 32-byte key (masterKey, notebookKey, noteKey). */
export function generateKey(): Uint8Array {
  return sodium().randombytes_buf(KEY_BYTES);
}

export function wrapKey(
  wrappingKey: Uint8Array,
  key: Uint8Array,
  ad: string,
  options?: EncryptOptions,
): string {
  if (key.length !== KEY_BYTES)
    throw new CryptoError("invalid_key", "wrapped key must be 32 bytes");
  return encryptToBase64Url(wrappingKey, key, ad, options);
}

export function unwrapKey(wrappingKey: Uint8Array, wrapped: string, ad: string): Uint8Array {
  const key = decryptFromBase64Url(wrappingKey, wrapped, ad);
  if (key.length !== KEY_BYTES)
    throw new CryptoError("invalid_key", "unwrapped key is not 32 bytes");
  return key;
}

export const wrapMasterKeyWithPassword = (
  masterKey: Uint8Array,
  passwordKey: Uint8Array,
  userId: string,
) => wrapKey(passwordKey, masterKey, AD.masterKeyPassword(userId));
export const unwrapMasterKeyWithPassword = (
  wrapped: string,
  passwordKey: Uint8Array,
  userId: string,
) => unwrapKey(passwordKey, wrapped, AD.masterKeyPassword(userId));

export const wrapMasterKeyWithRecovery = (
  masterKey: Uint8Array,
  recoveryKey: Uint8Array,
  userId: string,
) => wrapKey(recoveryKey, masterKey, AD.masterKeyRecovery(userId));
export const unwrapMasterKeyWithRecovery = (
  wrapped: string,
  recoveryKey: Uint8Array,
  userId: string,
) => unwrapKey(recoveryKey, wrapped, AD.masterKeyRecovery(userId));

export const wrapNotebookKey = (
  notebookKey: Uint8Array,
  masterKey: Uint8Array,
  notebookId: string,
) => wrapKey(masterKey, notebookKey, AD.notebookKey(notebookId));
export const unwrapNotebookKey = (wrapped: string, masterKey: Uint8Array, notebookId: string) =>
  unwrapKey(masterKey, wrapped, AD.notebookKey(notebookId));

/** Server side of agent mode (crypto.md §8). */
export const wrapNotebookKeyForServer = (
  notebookKey: Uint8Array,
  serverKey: Uint8Array,
  notebookId: string,
) => wrapKey(serverKey, notebookKey, AD.notebookKeyServer(notebookId));
export const unwrapNotebookKeyForServer = (
  wrapped: string,
  serverKey: Uint8Array,
  notebookId: string,
) => unwrapKey(serverKey, wrapped, AD.notebookKeyServer(notebookId));

export const wrapNoteKey = (noteKey: Uint8Array, notebookKey: Uint8Array, noteId: string) =>
  wrapKey(notebookKey, noteKey, AD.noteKey(noteId));
export const unwrapNoteKey = (wrapped: string, notebookKey: Uint8Array, noteId: string) =>
  unwrapKey(notebookKey, wrapped, AD.noteKey(noteId));

/**
 * Move a note to another notebook: its noteKey re-wrapped by the new
 * notebookKey (the note content itself is not re-encrypted).
 */
export const rewrapNoteKey = (
  wrapped: string,
  fromNotebookKey: Uint8Array,
  toNotebookKey: Uint8Array,
  noteId: string,
) => wrapNoteKey(unwrapNoteKey(wrapped, fromNotebookKey, noteId), toNotebookKey, noteId);

/** Encrypt a Yjs update or snapshot of `docId` (ad `ds1|doc|<docId>`). */
export const encryptDocUpdate = (
  key: Uint8Array,
  docId: string,
  update: Uint8Array,
  options?: EncryptOptions,
) => encryptEnvelope(key, update, AD.doc(docId), options);
export const decryptDocUpdate = (key: Uint8Array, docId: string, envelope: Uint8Array) =>
  decryptEnvelope(key, envelope, AD.doc(docId));

export const encryptAwareness = (
  key: Uint8Array,
  docId: string,
  update: Uint8Array,
  options?: EncryptOptions,
) => encryptEnvelope(key, update, AD.awareness(docId), options);
export const decryptAwareness = (key: Uint8Array, docId: string, envelope: Uint8Array) =>
  decryptEnvelope(key, envelope, AD.awareness(docId));

// ---------------------------------------------------------------------------
// Account flows
// ---------------------------------------------------------------------------

export interface NewAccountKeys {
  salt: Uint8Array;
  kdf: KdfParams;
  loginKey: Uint8Array;
  passwordKey: Uint8Array;
  masterKey: Uint8Array;
  recoveryKey: Uint8Array;
  /** `DS1-…`, shown to the user exactly once. */
  recoveryKeyText: string;
  recoveryLoginKey: Uint8Array;
  wrappedMasterKeyPassword: string;
  wrappedMasterKeyRecovery: string;
}

/** Everything a client needs for `POST /auth/signup` (plus secrets to keep locally). */
export function createAccountKeys(
  password: string,
  userId: string,
  kdf: KdfParams = DEFAULT_KDF,
): NewAccountKeys {
  const salt = generateSalt();
  const { loginKey, passwordKey } = derivePasswordKeys(password, salt, kdf);
  const masterKey = generateKey();
  const recoveryKey = generateRecoveryKey();
  return {
    salt,
    kdf,
    loginKey,
    passwordKey,
    masterKey,
    recoveryKey,
    recoveryKeyText: formatRecoveryKey(recoveryKey),
    recoveryLoginKey: deriveRecoveryLoginKey(recoveryKey),
    wrappedMasterKeyPassword: wrapMasterKeyWithPassword(masterKey, passwordKey, userId),
    wrappedMasterKeyRecovery: wrapMasterKeyWithRecovery(masterKey, recoveryKey, userId),
  };
}

export interface RekeyedPassword {
  salt: Uint8Array;
  kdf: KdfParams;
  loginKey: Uint8Array;
  passwordKey: Uint8Array;
  wrappedMasterKeyPassword: string;
}

/**
 * New password for an existing masterKey (crypto.md §4–5): new salt, new
 * loginKey, new wrappedMasterKeyPassword. Used by password change and recovery.
 */
export function rekeyPassword(
  masterKey: Uint8Array,
  newPassword: string,
  userId: string,
  kdf: KdfParams = DEFAULT_KDF,
): RekeyedPassword {
  const salt = generateSalt();
  const { loginKey, passwordKey } = derivePasswordKeys(newPassword, salt, kdf);
  return {
    salt,
    kdf,
    loginKey,
    passwordKey,
    wrappedMasterKeyPassword: wrapMasterKeyWithPassword(masterKey, passwordKey, userId),
  };
}

/** JSON-ready signup fields (base64url) from {@link createAccountKeys}. */
export function signupFields(keys: NewAccountKeys) {
  return {
    salt: toBase64Url(keys.salt),
    kdf: keys.kdf,
    loginKey: toBase64Url(keys.loginKey),
    recoveryLoginKey: toBase64Url(keys.recoveryLoginKey),
    wrappedMasterKeyPassword: keys.wrappedMasterKeyPassword,
    wrappedMasterKeyRecovery: keys.wrappedMasterKeyRecovery,
  };
}
