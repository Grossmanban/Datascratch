export type CryptoErrorCode =
  | "decrypt_failed"
  | "unsupported_version"
  | "malformed"
  | "invalid_key"
  | "invalid_recovery_key"
  /** The server sent KDF params outside the accepted bounds (crypto.md §2). */
  | "unsafe_kdf";

export class CryptoError extends Error {
  override readonly name = "CryptoError";
  constructor(
    readonly code: CryptoErrorCode,
    message: string,
  ) {
    super(message);
  }
}
