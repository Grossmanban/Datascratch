import sodiumModule from 'libsodium-wrappers-sumo';

export type Sodium = typeof sodiumModule;

let ready: Promise<Sodium> | undefined;

export function getSodium(): Promise<Sodium> {
  ready ??= sodiumModule.ready.then(() => sodiumModule);
  return ready;
}

const ENVELOPE_VERSION = 0x01;
const NONCE_BYTES = 24;

/** Envelope v1 (crypto.md §3): version || nonce || XChaCha20-Poly1305(plaintext, ad). */
export async function seal(key: Uint8Array, plaintext: Uint8Array, ad: string): Promise<Uint8Array> {
  const s = await getSodium();
  const nonce = s.randombytes_buf(NONCE_BYTES);
  const ct = s.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, ad, null, nonce, key);
  const out = new Uint8Array(1 + NONCE_BYTES + ct.length);
  out[0] = ENVELOPE_VERSION;
  out.set(nonce, 1);
  out.set(ct, 1 + NONCE_BYTES);
  return out;
}

export async function open(key: Uint8Array, envelope: Uint8Array, ad: string): Promise<Uint8Array> {
  const s = await getSodium();
  if (envelope.length < 1 + NONCE_BYTES + 16 || envelope[0] !== ENVELOPE_VERSION) {
    throw new Error('malformed envelope');
  }
  const nonce = envelope.subarray(1, 1 + NONCE_BYTES);
  return s.crypto_aead_xchacha20poly1305_ietf_decrypt(null, envelope.subarray(1 + NONCE_BYTES), ad, nonce, key);
}

/** Associated-data strings from crypto.md §3. */
export const AD = {
  doc: (docId: string) => `ds1|doc|${docId}`,
  awareness: (docId: string) => `ds1|awareness|${docId}`,
  notebookServer: (notebookId: string) => `ds1|key|notebook-server|${notebookId}`,
  note: (noteId: string) => `ds1|key|note|${noteId}`,
  attachment: (attachmentId: string, index: number, last: boolean) =>
    `ds1|att|${attachmentId}|${index}|${last ? 1 : 0}`,
} as const;
