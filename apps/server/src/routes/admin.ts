import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import { users } from '../db/schema.js';
import { forbidden } from '../lib/errors.js';
import { BackupStatus, backupStatus } from '../ops/backup-status.js';
import { errorResponses } from './schemas.js';

/** Server admins: the accounts in DS_ADMIN_EMAILS (as for /admin/voice). */
export function isServerAdmin(ctx: AppContext, email: string): boolean {
  return ctx.config.DS_ADMIN_EMAILS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/** Admin screens of the web app (api.md «Администрирование»). */
export function adminRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const security = [{ bearer: [] }];
    app.get(
      '/admin/backup',
      { schema: { tags: ['admin'], security, response: { 200: BackupStatus, ...errorResponses } } },
      async (req) => {
        const p = await requireUser(ctx, req);
        const [u] = await ctx.database.db.select({ email: users.email }).from(users).where(eq(users.id, p.userId));
        if (!u || !isServerAdmin(ctx, u.email)) throw forbidden('only a server admin can do this');
        return backupStatus(ctx.config.BACKUP_STATUS_DIR);
      },
    );
  };
}
