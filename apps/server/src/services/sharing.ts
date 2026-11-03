import { and, eq } from 'drizzle-orm';
import type { DbOrTx } from '../db/client.js';
import { docs, invitations, members, notebooks, spaces } from '../db/schema.js';
import { forbidden, notFound } from '../lib/errors.js';

/** A notebook or a note shared on its own (D-54), or a shared space (D-62). */
export type TargetKind = 'notebook' | 'note' | 'space';
export interface Target {
  kind: TargetKind;
  id: string;
}

export interface TargetRow extends Target {
  ownerId: string;
  keyVersion: number;
  /** Newest first: the key of version v-1 wrapped by the key of v (crypto.md §10.3). */
  keyChain: string[];
  keyRotationPending: boolean;
  /**
   * Agent mode of the notebook, or of the notebook a note lives in: rotation of an agent-mode
   * notebook needs the new key (crypto.md §8); members see it as a read-only badge (D-54).
   */
  mode: 'private' | 'agent' | null;
  /** The shared space the target is in (D-62): a notebook's, a note's notebook's, or the space itself. */
  spaceId: string | null;
}

export type MemberRow = typeof members.$inferSelect;

/** Column of members / invitations pointing at the target. */
export const memberTargetCol = (kind: TargetKind) =>
  kind === 'notebook' ? members.notebookId : kind === 'note' ? members.noteId : members.spaceId;
export const invitationTargetCol = (kind: TargetKind) =>
  kind === 'notebook' ? invitations.notebookId : kind === 'note' ? invitations.noteId : invitations.spaceId;
export const targetValues = (t: Target) => ({
  notebookId: t.kind === 'notebook' ? t.id : null,
  noteId: t.kind === 'note' ? t.id : null,
  spaceId: t.kind === 'space' ? t.id : null,
});
/** The target of a members / invitations row. */
export const targetOfRow = (r: { notebookId: string | null; noteId: string | null; spaceId: string | null }): Target =>
  r.notebookId
    ? { kind: 'notebook', id: r.notebookId }
    : r.spaceId
      ? { kind: 'space', id: r.spaceId }
      : { kind: 'note', id: r.noteId! };

/** Load a target, optionally locking its row (serializes invitations, members and rotations). */
export async function loadTarget(db: DbOrTx, t: Target, lock = false): Promise<TargetRow | null> {
  if (t.kind === 'notebook') {
    const q = db.select().from(notebooks).where(eq(notebooks.id, t.id));
    const [nb] = lock ? await q.for('update') : await q;
    if (!nb) return null;
    return {
      kind: 'notebook',
      id: nb.id,
      ownerId: nb.userId,
      keyVersion: nb.keyVersion,
      keyChain: nb.keyChain,
      keyRotationPending: nb.keyRotationPending,
      mode: nb.mode,
      spaceId: nb.spaceId,
    };
  }
  if (t.kind === 'space') {
    const q = db.select().from(spaces).where(eq(spaces.id, t.id));
    const [sp] = lock ? await q.for('update') : await q;
    if (!sp) return null;
    return {
      kind: 'space',
      id: sp.id,
      ownerId: sp.userId,
      keyVersion: sp.keyVersion,
      keyChain: sp.keyChain,
      keyRotationPending: sp.keyRotationPending,
      mode: null,
      spaceId: sp.id,
    };
  }
  const q = db
    .select()
    .from(docs)
    .where(and(eq(docs.id, t.id), eq(docs.kind, 'note')));
  const [d] = lock ? await q.for('update') : await q;
  if (!d) return null;
  const [nb] = d.notebookId
    ? await db.select({ mode: notebooks.mode, spaceId: notebooks.spaceId }).from(notebooks).where(eq(notebooks.id, d.notebookId))
    : [];
  return {
    kind: 'note',
    id: d.id,
    ownerId: d.userId,
    keyVersion: d.keyVersion,
    keyChain: d.keyChain,
    keyRotationPending: d.keyRotationPending,
    mode: nb?.mode ?? null,
    spaceId: nb?.spaceId ?? null,
  };
}

export async function memberOf(db: DbOrTx, t: Target, userId: string): Promise<MemberRow | null> {
  const [m] = await db
    .select()
    .from(members)
    .where(and(eq(memberTargetCol(t.kind), t.id), eq(members.userId, userId)));
  return m ?? null;
}

/**
 * A target only its owner may manage: `not_found` when the caller cannot see it at all,
 * `forbidden` for its members (api.md: «только владелец»).
 */
export async function requireOwnTarget(db: DbOrTx, userId: string, t: Target, lock = false): Promise<TargetRow> {
  const row = await loadTarget(db, t, lock);
  if (row && row.ownerId === userId) return row;
  if (row && (await seesTarget(db, row, userId))) throw forbidden('only the owner can do this');
  throw notFound(`${t.kind} not found`);
}

/** A target the caller owns or is a member of (also through its shared space, D-62). */
export async function requireVisibleTarget(db: DbOrTx, userId: string, t: Target): Promise<TargetRow> {
  const row = await loadTarget(db, t);
  if (row && (row.ownerId === userId || (await seesTarget(db, row, userId)))) return row;
  throw notFound(`${t.kind} not found`);
}

/** A member of the target itself, or of the shared space it is in. */
async function seesTarget(db: DbOrTx, row: TargetRow, userId: string): Promise<boolean> {
  if (await memberOf(db, row, userId)) return true;
  return row.kind !== 'space' && row.spaceId !== null && (await memberOf(db, { kind: 'space', id: row.spaceId }, userId)) !== null;
}
