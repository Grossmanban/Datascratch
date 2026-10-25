// Attachments (crypto.md §6): 1 MiB plaintext chunks, one envelope per chunk,
// ad `ds1|att|<attachmentId>|<index>|<last>` so chunks cannot be reordered,
// swapped between files or truncated.
import { AD, ATTACHMENT_CHUNK_BYTES, ENVELOPE_OVERHEAD } from "../contracts/crypto.js";
import { concatBytes } from "./base64url.js";
import { decryptEnvelope, encryptEnvelope, type EncryptOptions } from "./envelope.js";
import { CryptoError } from "./errors.js";

/** Number of chunks for a plaintext of `size` bytes (an empty file is one empty chunk). */
export function attachmentChunkCount(size: number): number {
  return Math.max(1, Math.ceil(size / ATTACHMENT_CHUNK_BYTES));
}

/** Total ciphertext bytes (the `size` of `POST /attachments`). */
export function attachmentCiphertextSize(plainSize: number): number {
  return plainSize + attachmentChunkCount(plainSize) * ENVELOPE_OVERHEAD;
}

export function encryptAttachmentChunk(
  noteKey: Uint8Array,
  attachmentId: string,
  index: number,
  last: boolean,
  plaintext: Uint8Array,
  options?: EncryptOptions,
): Uint8Array {
  if (plaintext.length > ATTACHMENT_CHUNK_BYTES)
    throw new CryptoError("malformed", "chunk larger than 1 MiB");
  return encryptEnvelope(
    noteKey,
    plaintext,
    AD.attachmentChunk(attachmentId, index, last),
    options,
  );
}

export function decryptAttachmentChunk(
  noteKey: Uint8Array,
  attachmentId: string,
  index: number,
  last: boolean,
  envelope: Uint8Array,
): Uint8Array {
  return decryptEnvelope(noteKey, envelope, AD.attachmentChunk(attachmentId, index, last));
}

/** Split and encrypt a whole file. */
export function encryptAttachment(
  noteKey: Uint8Array,
  attachmentId: string,
  data: Uint8Array,
): Uint8Array[] {
  const count = attachmentChunkCount(data.length);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    const part = data.subarray(i * ATTACHMENT_CHUNK_BYTES, (i + 1) * ATTACHMENT_CHUNK_BYTES);
    chunks.push(encryptAttachmentChunk(noteKey, attachmentId, i, i === count - 1, part));
  }
  return chunks;
}

/** Decrypt all chunks in order; fails on a missing, extra, reordered or foreign chunk. */
export function decryptAttachment(
  noteKey: Uint8Array,
  attachmentId: string,
  chunks: Uint8Array[],
): Uint8Array {
  if (chunks.length === 0) throw new CryptoError("malformed", "attachment has no chunks");
  const parts = chunks.map((c, i) =>
    decryptAttachmentChunk(noteKey, attachmentId, i, i === chunks.length - 1, c),
  );
  return concatBytes(...parts);
}
