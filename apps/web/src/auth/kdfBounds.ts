// crypto.md §2 «Границы параметров на клиенте» (audit 2026-10-27): the KDF parameters come from
// the server (whose address the user types in, D-49). A hostile server could lower them to get a
// loginKey that is cheap to brute-force, so the prelogin response is checked against the shared
// schema (whose kdf part enforces KDF_BOUNDS) before anything is derived. derivePasswordKeys
// refuses unsafe parameters too (CryptoError "unsafe_kdf"); both show the same message.
import { CryptoError, isSafeKdf, preloginResponseSchema, type PreloginResponse } from "@datascratch/shared";

export class UnsafeKdfError extends Error {
  constructor(detail: string) {
    super(`The server sent unsafe key derivation parameters (${detail})`);
    this.name = "UnsafeKdfError";
  }
}

/** The prelogin response, checked against the contract schema and the client's KDF bounds. */
export function checkedPrelogin(raw: unknown): PreloginResponse {
  const kdf = (raw as { kdf?: unknown } | null)?.kdf;
  if (!isSafeKdf(kdf)) throw new UnsafeKdfError(JSON.stringify(kdf ?? null));
  const parsed = preloginResponseSchema.safeParse(raw);
  if (!parsed.success) throw new UnsafeKdfError("malformed");
  return parsed.data;
}

export const isUnsafeKdf = (e: unknown) => e instanceof UnsafeKdfError || (e instanceof CryptoError && e.code === "unsafe_kdf");
