import { and, eq, gt, inArray, isNotNull, lt, or } from 'drizzle-orm';
import type { DbOrTx } from '../db/client.js';
import { docs, userDocs } from '../db/schema.js';
import { loadMemberships, memberRoleFor } from './access.js';
import type { ChangeLog } from './change-log.js';

/** Removed rows of `user_docs` are kept this long; an older cursor is a `reset`. */
export const RESUME_KEEP_DAYS = 30;
const INSERT_CHUNK = 1000;

export interface ReadableDoc {
  docId: string;
  lastSeq: number;
  write: boolean;
}

/**
 * Every document an account can read now (sync-protocol §6: its own and those reached through
 * memberships, as `accessFor` decides for one document).
 */
export async function readableDocs(db: DbOrTx, userId: string): Promise<Map<string, ReadableDoc>> {
  const cols = { id: docs.id, userId: docs.userId, kind: docs.kind, notebookId: docs.notebookId, lastSeq: docs.lastSeq };
  const out = new Map<string, ReadableDoc>();
  for (const r of await db.select(cols).from(docs).where(eq(docs.userId, userId))) {
    out.set(r.id, { docId: r.id, lastSeq: r.lastSeq, write: true });
  }
  const m = await loadMemberships(db, userId);
  const nbIds = [...m.notebooks.keys()];
  const direct = [...m.notes.keys(), ...m.spaces.keys()];
  if (nbIds.length === 0 && direct.length === 0) return out;
  const conds = [
    ...(nbIds.length > 0 ? [inArray(docs.notebookId, nbIds)] : []),
    ...(direct.length > 0 ? [inArray(docs.id, direct)] : []),
  ];
  const rows = await db.select(cols).from(docs).where(conds.length === 1 ? conds[0] : or(...conds));
  for (const r of rows) {
    if (r.userId === userId) continue;
    const role = memberRoleFor(m, r as Parameters<typeof memberRoleFor>[1]);
    if (role) out.set(r.id, { docId: r.id, lastSeq: r.lastSeq, write: role === 'editor' });
  }
  return out;
}

/**
 * Bring `user_docs` up to the account's current access (sync-protocol §3.1): documents that
 * became readable get `granted_pos`, ones no longer readable (or deleted) get `removed_pos`.
 * Call inside `changes.scope`, before taking the new cursor.
 */
export async function syncUserDocs(db: DbOrTx, changes: ChangeLog, userId: string, readable: Map<string, ReadableDoc>) {
  await db.transaction(async (tx) => {
    const known = await tx
      .select({ docId: userDocs.docId, removedPos: userDocs.removedPos })
      .from(userDocs)
      .where(eq(userDocs.userId, userId));
    const active = new Set(known.filter((k) => k.removedPos === null).map((k) => k.docId));
    const granted = [...readable.keys()].filter((id) => !active.has(id));
    const removed = [...active].filter((id) => !readable.has(id));
    if (granted.length === 0 && removed.length === 0) return;
    const pos = changes.allocate();
    const now = new Date();
    for (let i = 0; i < granted.length; i += INSERT_CHUNK) {
      await tx
        .insert(userDocs)
        .values(granted.slice(i, i + INSERT_CHUNK).map((docId) => ({ userId, docId, grantedPos: pos, removedPos: null, changedAt: now })))
        .onConflictDoUpdate({
          target: [userDocs.userId, userDocs.docId],
          set: { grantedPos: pos, removedPos: null, changedAt: now },
        });
    }
    for (let i = 0; i < removed.length; i += INSERT_CHUNK) {
      await tx
        .update(userDocs)
        .set({ removedPos: pos, changedAt: now })
        .where(and(eq(userDocs.userId, userId), inArray(userDocs.docId, removed.slice(i, i + INSERT_CHUNK))));
    }
  });
}

/**
 * What changed for the account after `since` (positions): documents readable now with an update
 * or a grant after it (with their current seq), and documents removed after it.
 */
export async function changesSince(
  db: DbOrTx,
  userId: string,
  since: number,
  readable: Map<string, ReadableDoc>,
): Promise<{ docs: { docId: string; seq: number }[]; removed: string[] }> {
  const ids = [...readable.keys()];
  const changed = new Map<string, number>();
  for (let i = 0; i < ids.length; i += INSERT_CHUNK) {
    const rows = await db
      .select({ id: docs.id, seq: docs.lastSeq })
      .from(docs)
      .where(and(inArray(docs.id, ids.slice(i, i + INSERT_CHUNK)), gt(docs.changedPos, since)));
    for (const r of rows) changed.set(r.id, r.seq);
  }
  const ud = await db
    .select({ docId: userDocs.docId, grantedPos: userDocs.grantedPos, removedPos: userDocs.removedPos })
    .from(userDocs)
    .where(and(eq(userDocs.userId, userId), or(gt(userDocs.grantedPos, since), gt(userDocs.removedPos, since))));
  const removed: string[] = [];
  const grantedIds: string[] = [];
  for (const r of ud) {
    if (r.removedPos !== null && r.removedPos > since) {
      if (!readable.has(r.docId)) removed.push(r.docId);
    } else if (r.removedPos === null && r.grantedPos > since && readable.has(r.docId) && !changed.has(r.docId)) {
      grantedIds.push(r.docId);
    }
  }
  for (let i = 0; i < grantedIds.length; i += INSERT_CHUNK) {
    const rows = await db
      .select({ id: docs.id, seq: docs.lastSeq })
      .from(docs)
      .where(inArray(docs.id, grantedIds.slice(i, i + INSERT_CHUNK)));
    for (const r of rows) changed.set(r.id, r.seq);
  }
  return { docs: [...changed].map(([docId, seq]) => ({ docId, seq })), removed };
}

/** Forget removed rows older than RESUME_KEEP_DAYS (cursors that old are a reset anyway). */
export async function pruneUserDocs(db: DbOrTx, now = Date.now()) {
  await db
    .delete(userDocs)
    .where(and(lt(userDocs.changedAt, new Date(now - RESUME_KEEP_DAYS * 86_400_000)), isNotNull(userDocs.removedPos)));
}
