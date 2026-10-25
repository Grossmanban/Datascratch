export type CryptoErrorCode =
  "decrypt_failed" | "unsupported_version" | "malformed" | "invalid_key" | "invalid_recovery_key";

export class CryptoError extends Error {
  override readonly name = "CryptoError";
  constructor(
    readonly code: CryptoErrorCode,
    message: string,
  ) {
    super(message);
  }
}
