import { and, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm';
import type { DbOrTx } from '../db/client.js';
import { docs, members, shares } from '../db/schema.js';
import type { GuestPrincipal, Principal } from './principal.js';

export type DocRow = typeof docs.$inferSelect;
export type ShareRow = typeof shares.$inferSelect;

export interface DocAccess {
  doc: DocRow;
  write: boolean;
  /** The principal owns the document (owner-only actions: delete, move, shares, members). */
  owner: boolean;
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
 * Notebooks and notes shared with an account (D-54), by target id. A member whose account was
 * registered after the invitation gets nothing until the owner confirms by giving the key.
 */
export interface Memberships {
  notebooks: Map<string, { ownerId: string; role: MemberRole }>;
  notes: Map<string, { ownerId: string; role: MemberRole }>;
}

export type MemberRole = 'editor' | 'viewer';

export async function loadMemberships(db: DbOrTx, userId: string): Promise<Memberships> {
  const rows = await db
    .select({ notebookId: members.notebookId, noteId: members.noteId, ownerId: members.ownerId, role: members.role })
    .from(members)
    .where(
      and(
        eq(members.userId, userId),
        or(eq(members.accountCreatedAfterInvite, false), isNotNull(members.wrappedKey)),
      ),
    );
  const m: Memberships = { notebooks: new Map(), notes: new Map() };
  for (const r of rows) {
    if (r.notebookId) m.notebooks.set(r.notebookId, { ownerId: r.ownerId, role: r.role });
    else if (r.noteId) m.notes.set(r.noteId, { ownerId: r.ownerId, role: r.role });
  }
  return m;
}

/** The role an account has on a document of somebody else's (null: none). */
export function memberRoleFor(m: Memberships, doc: DocRow): MemberRole | null {
  const roles: MemberRole[] = [];
  if (doc.kind !== 'account' && doc.notebookId) {
    const nb = m.notebooks.get(doc.notebookId);
    if (nb && nb.ownerId === doc.userId) roles.push(nb.role);
  }
  if (doc.kind === 'note') {
    const n = m.notes.get(doc.id);
    if (n && n.ownerId === doc.userId) roles.push(n.role);
  }
  if (roles.length === 0) return null;
  return roles.includes('editor') ? 'editor' : 'viewer';
}

/**
 * Access of a principal to a loaded document row (null = not visible; callers report it as
 * doc_not_found / not_found, so existence is not leaked). `owner`: the principal owns it.
 */
export function accessFor(p: Principal, doc: DocRow, memberships?: Memberships): DocAccess | null {
  switch (p.kind) {
    case 'user': {
      if (doc.userId === p.userId) return { doc, write: true, owner: true };
      const role = memberships ? memberRoleFor(memberships, doc) : null;
      return role ? { doc, write: role === 'editor', owner: false } : null;
    }
    case 'guest':
      return docInShare(doc, p) ? { doc, write: p.permission === 'edit', owner: false } : null;
  }
}

export async function docAccess(db: DbOrTx, p: Principal, docId: string): Promise<DocAccess | null> {
  const [doc] = await db.select().from(docs).where(eq(docs.id, docId));
  if (!doc) return null;
  const memberships = p.kind === 'user' && doc.userId !== p.userId ? await loadMemberships(db, p.userId) : undefined;
  return accessFor(p, doc, memberships);
}

/** Load many document rows at once. */
export async function loadDocs(db: DbOrTx, ids: string[]): Promise<Map<string, DocRow>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select().from(docs).where(inArray(docs.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}
