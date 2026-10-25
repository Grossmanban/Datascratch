import { createHash } from "node:crypto";
import { toBase64Url, toHex } from "@datascratch/shared/crypto";
import sodium from "libsodium-wrappers-sumo";

/** Deterministic pseudo-random bytes: BLAKE2b(n, message = "ds-vectors|" + label). */
export function det(label: string, n: number): Uint8Array {
  if (n === 0) return new Uint8Array(0);
  if (n <= 64) return sodium.crypto_generichash(n, `ds-vectors|${label}`, null);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 64)
    out.set(det(`${label}|${i / 64}`, 64).subarray(0, Math.min(64, n - i)), i);
  return out;
}

export const hex = toHex;
export const b64 = toBase64Url;
export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Fixed UUIDv7-shaped ids for readability: 0192f3c4-0000-7000-8000-<n>. */
export function vid(n: number): string {
  return `0192f3c4-0000-7000-8000-${n.toString(16).padStart(12, "0")}`;
}
