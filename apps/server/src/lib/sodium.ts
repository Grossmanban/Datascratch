import { AD as SHARED_AD, decryptEnvelope, encryptEnvelope, initCrypto, type Sodium } from '@datascratch/shared/crypto';

export type { Sodium };

/** libsodium, initialized once (shared with @datascratch/shared/crypto). */
export const getSodium = (): Promise<Sodium> => initCrypto();

/** Envelope v1 (crypto.md §3), implemented by @datascratch/shared. */
export async function seal(key: Uint8Array, plaintext: Uint8Array, ad: string): Promise<Uint8Array> {
  await initCrypto();
  return encryptEnvelope(key, plaintext, ad);
}

export async function open(key: Uint8Array, envelope: Uint8Array, ad: string): Promise<Uint8Array> {
  await initCrypto();
  return decryptEnvelope(key, envelope, ad);
}

/** Associated-data strings from crypto.md §3 (names kept short for server code). */
export const AD = {
  doc: SHARED_AD.doc,
  awareness: SHARED_AD.awareness,
  notebookServer: SHARED_AD.notebookKeyServer,
  note: SHARED_AD.noteKey,
  attachment: SHARED_AD.attachmentChunk,
} as const;
