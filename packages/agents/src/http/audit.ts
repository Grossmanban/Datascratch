/** Journal of every agent action (spec/09: "Журнал всех действий агента"). */
import type { AgentsContext } from "../context.js";
import { toAgentError } from "../errors.js";
import type { Principal } from "../service/access.js";
import { uuidv7 } from "../util.js";

export interface AuditTarget {
  notebookId?: string | null;
  noteId?: string | null;
}

export function targetOf(args: unknown): AuditTarget {
  const a = (args ?? {}) as Record<string, unknown>;
  return {
    notebookId: typeof a.notebookId === "string" ? a.notebookId : null,
    noteId: typeof a.noteId === "string" ? a.noteId : null,
  };
}

/** Runs an operation and records it — successful or not — in the audit log. */
export async function audited<T>(ctx: AgentsContext, p: Principal, action: string, target: AuditTarget, run: () => Promise<T>): Promise<T> {
  const started = Date.now();
  const write = async (ok: boolean, errorCode: string | null) => {
    try {
      await ctx.store.appendAudit({
        id: uuidv7(),
        grantId: p.grant.id,
        userId: p.grant.userId,
        at: (ctx.now?.() ?? new Date()).toISOString(),
        via: p.via,
        action,
        notebookId: target.notebookId ?? null,
        noteId: target.noteId ?? null,
        ok,
        errorCode,
        durationMs: Date.now() - started,
      });
    } catch {
      // The journal must not turn a successful operation into a failure.
    }
  };
  try {
    const result = await run();
    await write(true, null);
    return result;
  } catch (err) {
    await write(false, toAgentError(err).code);
    throw err;
  }
}
