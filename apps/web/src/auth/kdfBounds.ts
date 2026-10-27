// crypto.md §2 «Границы параметров на клиенте» (audit 2026-10-27): the KDF parameters come from
// the server (whose address the user types in, D-49). A hostile server could lower them to get a
// loginKey that is cheap to brute-force, so the client only accepts parameters within bounds and
// refuses to sign in or derive keys otherwise.
import { KDF_ALG, preloginResponseSchema, type PreloginResponse } from "@datascratch/shared";

export const KDF_OPS_MIN = 3;
export const KDF_OPS_MAX = 10;
export const KDF_MEM_MIN = 64 * 1024 * 1024;
export const KDF_MEM_MAX = 256 * 1024 * 1024;

export class UnsafeKdfError extends Error {
  constructor(detail: string) {
    super(`The server sent unsafe key derivation parameters (${detail})`);
    this.name = "UnsafeKdfError";
  }
}

/** The prelogin response, checked against the contract schema and the client's KDF bounds. */
export function checkedPrelogin(raw: unknown): PreloginResponse {
  const parsed = preloginResponseSchema.safeParse(raw);
  if (!parsed.success) throw new UnsafeKdfError("malformed");
  const { kdf } = parsed.data;
  if (kdf.alg !== KDF_ALG) throw new UnsafeKdfError(`alg ${String(kdf.alg)}`);
  if (kdf.ops < KDF_OPS_MIN || kdf.ops > KDF_OPS_MAX) throw new UnsafeKdfError(`ops ${kdf.ops}`);
  if (kdf.mem < KDF_MEM_MIN || kdf.mem > KDF_MEM_MAX) throw new UnsafeKdfError(`mem ${kdf.mem}`);
  return parsed.data;
}
