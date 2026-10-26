import { ApiError, NetworkError, request } from "@/api/client";
import { accountDb, type OpRow } from "./db";

/** REST mutations that must survive being offline (create notebook, register doc, …). */
export async function enqueueOp(op: Omit<OpRow, "id" | "createdAt">): Promise<void> {
  await accountDb().ops.add({ ...op, createdAt: Date.now() });
  opsChanged();
}

const listeners = new Set<() => void>();
const registeredListeners = new Set<(docId: string) => void>();
/** A document became known to the server (POST /v1/docs succeeded). */
export function onDocRegistered(fn: (docId: string) => void) {
  registeredListeners.add(fn);
  return () => registeredListeners.delete(fn);
}
const notebookConflictListeners = new Set<() => void>();
/** POST /notebooks answered 409: the server already holds a key for it (see checkNotebookKeys). */
export function onNotebookConflict(fn: () => void) {
  notebookConflictListeners.add(fn);
  return () => notebookConflictListeners.delete(fn);
}
export function onOpsChanged(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function opsChanged() {
  for (const fn of listeners) fn();
}

let running: Promise<boolean> | null = null;

/** Runs queued ops in order. Resolves false if the server is unreachable. */
export function flushOps(): Promise<boolean> {
  if (!running) {
    running = runOps().finally(() => {
      running = null;
    });
  }
  return running;
}

async function runOps(): Promise<boolean> {
  const db = accountDb();
  for (;;) {
    const op = await db.ops.orderBy("id").first();
    if (!op) return true;
    try {
      await request(op.method, op.path, { body: op.body });
    } catch (e) {
      if (e instanceof NetworkError) return false;
      if (e instanceof ApiError && (e.status >= 500 || e.status === 429 || e.status === 401)) return false;
      // 409 for an idempotent create with the same id means it already exists — fine.
      // Other 4xx would block the queue forever; drop and log.
      if (!(e instanceof ApiError && e.code === "conflict")) console.warn("Dropping failed op", op, e);
      else if (op.path === "/notebooks") for (const fn of notebookConflictListeners) fn();
    }
    await db.transaction("rw", db.ops, db.docs, async () => {
      await db.ops.delete(op.id!);
      if (op.registersDoc) await db.docs.update(op.registersDoc, { registered: 1 });
    });
    if (op.registersDoc) for (const fn of registeredListeners) fn(op.registersDoc);
  }
}
