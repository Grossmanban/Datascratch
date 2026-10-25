import { hkdfSync } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';

export interface AccessClaims {
  userId: string;
  deviceId: string;
}

export interface GuestClaims {
  shareId: string;
}

const ISSUER = 'datascratch';

function subkey(secret: Uint8Array, label: string): Uint8Array {
  return new Uint8Array(hkdfSync('sha256', secret, new Uint8Array(0), `ds1|${label}`, 32));
}

/** Signs and verifies short-lived access tokens and guest tokens (HS256). */
export class TokenSigner {
  readonly #accessKey: Uint8Array;
  readonly #guestKey: Uint8Array;
  readonly #webKey: Uint8Array;
  /** Secret handed to the agents plugin (signs its consent-form state). */
  readonly pluginSecret: Uint8Array;
  /** Key for deterministic values that must not be guessable (fake prelogin salts). */
  readonly fakeSaltKey: Uint8Array;

  constructor(
    secret: Uint8Array,
    readonly accessTtlSec: number,
  ) {
    this.#accessKey = subkey(secret, 'jwt-access');
    this.#guestKey = subkey(secret, 'jwt-guest');
    this.#webKey = subkey(secret, 'jwt-web');
    this.pluginSecret = subkey(secret, 'agents-plugin');
    this.fakeSaltKey = subkey(secret, 'fake-salt');
  }

  async signAccess(c: AccessClaims): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + this.accessTtlSec * 1000);
    const token = await new SignJWT({ did: c.deviceId, typ: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setSubject(c.userId)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.#accessKey);
    return { token, expiresAt };
  }

  async verifyAccess(token: string): Promise<AccessClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.#accessKey, { issuer: ISSUER, algorithms: ['HS256'] });
      if (payload.typ !== 'access' || typeof payload.sub !== 'string' || typeof payload.did !== 'string') return null;
      return { userId: payload.sub, deviceId: payload.did };
    } catch {
      return null;
    }
  }

  /** Browser session for server-rendered pages (OAuth consent of the agents plugin). */
  async signWeb(c: AccessClaims, ttlSec: number): Promise<string> {
    return new SignJWT({ did: c.deviceId, typ: 'web' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setSubject(c.userId)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSec)
      .sign(this.#webKey);
  }

  async verifyWeb(token: string): Promise<AccessClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.#webKey, { issuer: ISSUER, algorithms: ['HS256'] });
      if (payload.typ !== 'web' || typeof payload.sub !== 'string' || typeof payload.did !== 'string') return null;
      return { userId: payload.sub, deviceId: payload.did };
    } catch {
      return null;
    }
  }

  /** Guest tokens live as long as the share; revocation is checked on every use. */
  async signGuest(c: GuestClaims, expiresAt: Date | null): Promise<string> {
    const jwt = new SignJWT({ typ: 'guest' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setSubject(c.shareId)
      .setIssuedAt();
    if (expiresAt) jwt.setExpirationTime(Math.floor(expiresAt.getTime() / 1000));
    return jwt.sign(this.#guestKey);
  }

  async verifyGuest(token: string): Promise<GuestClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.#guestKey, { issuer: ISSUER, algorithms: ['HS256'] });
      if (payload.typ !== 'guest' || typeof payload.sub !== 'string') return null;
      return { shareId: payload.sub };
    } catch {
      return null;
    }
  }
}
