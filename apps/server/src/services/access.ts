import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { DbOrTx } from '../db/client.js';
import { docs, shares } from '../db/schema.js';
import type { GuestPrincipal, Principal } from './principal.js';

export type DocRow = typeof docs.$inferSelect;
export type ShareRow = typeof shares.$inferSelect;

export interface DocAccess {
  doc: DocRow;
  write: boolean;
}

export function shareIsActive(s: Pick<ShareRow, 'revokedAt' | 'expiresAt'>, now = new Date()): boolean {
  return !s.revokedAt && (!s.expiresAt || s.expiresAt > now);
}

export async function loadActiveShare(db: DbOrTx, shareId: string): Promise<ShareRow | null> {
  const [s] = await db.select().from(shares).where(and(eq(shares.id, shareId), isNull(shares.revokedAt)));
  return s && shareIsActive(s) ? s : null;
}

/** Whether a document belongs to the target of a share. */
export function docInShare(doc: DocRow, share: Pick<GuestPrincipal, 'ownerId' | 'target'>): boolean {
  if (doc.userId !== share.ownerId) return false;
  if (share.target.kind === 'note') return doc.id === share.target.id && doc.kind === 'note';
  return (
    (doc.id === share.target.id && doc.kind === 'notebook') ||
    (doc.kind === 'note' && doc.notebookId === share.target.id)
  );
}

/**
 * Resolve what a principal may do with a document. Returns null when the
 * document does not exist or is not visible to the principal (callers report
 * both as doc_not_found / not_found, so existence is not leaked).
 */
/** Access of a principal to a loaded document row (null = not visible). */
export function accessFor(p: Principal, doc: DocRow): DocAccess | null {
  switch (p.kind) {
    case 'user':
      return doc.userId === p.userId ? { doc, write: true } : null;
    case 'guest':
      return docInShare(doc, p) ? { doc, write: p.permission === 'edit' } : null;
  }
}

export async function docAccess(db: DbOrTx, p: Principal, docId: string): Promise<DocAccess | null> {
  const [doc] = await db.select().from(docs).where(eq(docs.id, docId));
  return doc ? accessFor(p, doc) : null;
}

/** Load many document rows at once. */
export async function loadDocs(db: DbOrTx, ids: string[]): Promise<Map<string, DocRow>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select().from(docs).where(inArray(docs.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}
