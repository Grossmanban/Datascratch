import { and, desc, eq, lt } from 'drizzle-orm';
import type { DbOrTx } from '../db/client.js';
import { agentAudit } from '../db/schema.js';

export interface AuditEntry {
  tokenId: string;
  userId: string;
  action: string;
  notebookId?: string | null;
  docId?: string | null;
  ok?: boolean;
  details?: Record<string, unknown> | null;
}

/** Journal of every agent action (spec/09-agents-api.md, "Безопасность"). */
export class AuditService {
  async record(db: DbOrTx, e: AuditEntry): Promise<void> {
    await db.insert(agentAudit).values({
      tokenId: e.tokenId,
      userId: e.userId,
      action: e.action,
      notebookId: e.notebookId ?? null,
      docId: e.docId ?? null,
      ok: e.ok ?? true,
      details: e.details ?? null,
    });
  }

  async list(db: DbOrTx, tokenId: string, opts: { before?: number; limit: number }) {
    return db
      .select()
      .from(agentAudit)
      .where(
        opts.before ? and(eq(agentAudit.tokenId, tokenId), lt(agentAudit.id, opts.before)) : eq(agentAudit.tokenId, tokenId),
      )
      .orderBy(desc(agentAudit.id))
      .limit(opts.limit);
  }
}
