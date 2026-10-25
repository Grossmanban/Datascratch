/**
 * Blob storage for attachment chunks (D-26). Blobs are already encrypted on the
 * client; the storage only ever sees ciphertext. Keys look like `att/<id>/<index>`.
 */
export interface BlobStorage {
  put(key: string, data: Uint8Array): Promise<void>;
  /** Returns null if the blob does not exist. */
  get(key: string): Promise<Uint8Array | null>;
  /** Deleting a missing blob is not an error. */
  delete(key: string): Promise<void>;
  /** Liveness check used by /health and at startup. */
  check(): Promise<void>;
}

export const chunkKey = (attachmentId: string, index: number) => `att/${attachmentId}/${index}`;
