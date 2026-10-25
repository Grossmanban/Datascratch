import type { FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { bearer, verifyUserToken, verifyWebCookie } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import { users } from '../db/schema.js';
import type { UserAuth, UserIdentity } from './agents-context.js';

/** User authentication for the agents plugin: Bearer access token, or the browser cookie for the consent page. */
export class ServerUserAuth implements UserAuth {
  constructor(private readonly ctx: AppContext) {}

  async authenticate(req: FastifyRequest): Promise<UserIdentity | null> {
    const token = bearer(req);
    const p = (token ? await verifyUserToken(this.ctx, token) : null) ?? (await verifyWebCookie(this.ctx, req));
    if (!p) return null;
    const [u] = await this.ctx.database.db.select({ email: users.email }).from(users).where(eq(users.id, p.userId));
    if (!u) return null;
    return { userId: p.userId, email: u.email };
  }

  /** The web app signs in if needed, calls POST /v1/auth/web-session and returns to `returnTo`. */
  loginUrl(returnTo: string): string | null {
    const app = this.ctx.config.APP_URL;
    if (!app) return null;
    const u = new URL('/connect', app);
    u.searchParams.set('returnTo', returnTo);
    return u.toString();
  }
}
