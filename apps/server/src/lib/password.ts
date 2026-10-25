import { hash, verify } from '@node-rs/argon2';
import { createHmac } from 'node:crypto';

// loginKey / recoveryLoginKey are already high-entropy 32-byte keys derived on
// the client with Argon2id(64 MiB); the server-side hash only has to make a
// stolen database useless, so moderate parameters (OWASP: m=19 MiB, t=2) suffice.
// algorithm 2 = Argon2id (the package exports a const enum, unusable with verbatimModuleSyntax).
const OPTIONS = { algorithm: 2, memoryCost: 19 * 1024, timeCost: 2, parallelism: 1 } as const;

// The native binding treats its input as UTF-8 text and rejects arbitrary bytes,
// so the 32-byte key is hashed in its base64url form.
const own = (b: Uint8Array) => Buffer.from(b).toString('base64url');

export const hashSecret = (secret: Uint8Array): Promise<string> => hash(own(secret), OPTIONS);

export async function verifySecret(phc: string, secret: Uint8Array): Promise<boolean> {
  try {
    return await verify(phc, own(secret));
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/** Burn the same time as a real verification so unknown emails are not distinguishable by timing. */
export async function verifyDummy(secret: Uint8Array): Promise<false> {
  dummyHash ??= hashSecret(Buffer.alloc(32));
  await verifySecret(await dummyHash, secret);
  return false;
}

/** Deterministic fake salt for unknown emails (api.md, /auth/prelogin). */
export function fakeSalt(secret: Uint8Array, email: string): Buffer {
  return createHmac('sha256', secret).update(`ds1|fake-salt|${email}`).digest().subarray(0, 16);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
