import { useMemo } from "react";
import { create } from "zustand";
import type * as Y from "yjs";
import type { Folder, NoteMeta, NotebookRef, SharedRef, Space, StarredRef } from "@/lib/shared";
import { readAccount, type AccountSnapshot, type SpaceEntry, type TabEntry } from "./account";
import { readSpaceDoc, type SpaceDocSnapshot } from "./space";
import { readNotebook, type NotebookSnapshot, type TagProps } from "./notebook";

export type NoteEntry = NoteMeta & { notebookId: string };
export type FolderEntry = Folder & { notebookId: string };

export type WorkspaceState = {
  ready: boolean;
  /** Account doc has synced at least once (or was created here). */
  accountSynced: boolean;
  /**
   * What the app shows: the account doc plus shared spaces (D-62) — other accounts' spaces this
   * one is a member of, and every shared space's notebooks from its space doc. Writes go to the
   * account doc (`ownAccount`) or a space doc, see domain/actions.
   */
  account: AccountSnapshot;
  /** The account doc as it is. */
  ownAccount: AccountSnapshot;
  /** Space docs of shared spaces (D-62), by spaceId. */
  spaceDocs: Record<string, SpaceDocSnapshot>;
  /** This account's place in shared spaces (D-62), by spaceId — set by data/sharedSpaces. */
  spaceAccess: Record<string, SpaceAccess>;
  notebooksData: Record<string, NotebookSnapshot>;
  /** Notes shared with this account on their own, without their notebook (D-54); `notebookId` is "". */
  standaloneNotes: Record<string, NoteEntry>;
  notes: Record<string, NoteEntry>;
  folders: Record<string, FolderEntry>;
  tagProps: Record<string, TagProps>;
  activeSpaceId: string | null;
};

export type SpaceAccess = {
  role: "owner" | "editor" | "viewer";
  /** The space's notebooks the server lists (GET /spaces/:id/notebooks); null until known. */
  notebookIds: string[] | null;
  /** This account holds the space key (a member: delivered by the owner's client). */
  keyed: boolean;
  ownerEmail?: string;
};

const emptyAccount: AccountSnapshot = {
  formatVersion: 1,
  spaces: [],
  notebooks: [],
  settings: {},
  starred: [],
  tabs: [],
  shared: [],
  sharedSpaces: [],
};

export const useWorkspace = create<WorkspaceState>(() => ({
  ready: false,
  accountSynced: false,
  account: emptyAccount,
  ownAccount: emptyAccount,
  spaceDocs: {},
  spaceAccess: {},
  notebooksData: {},
  standaloneNotes: {},
  notes: {},
  folders: {},
  tagProps: {},
  activeSpaceId: readLocalSpace(),
}));

function readLocalSpace(): string | null {
  try {
    return localStorage.getItem("ds.activeSpace");
  } catch {
    return null;
  }
}

export function setActiveSpace(id: string) {
  try {
    localStorage.setItem("ds.activeSpace", id);
  } catch {
    // private mode
  }
  useWorkspace.setState({ activeSpaceId: id });
}

export function resetWorkspace() {
  useWorkspace.setState({
    ready: false,
    accountSynced: false,
    account: emptyAccount,
    ownAccount: emptyAccount,
    spaceDocs: {},
    spaceAccess: {},
    notebooksData: {},
    standaloneNotes: {},
    notes: {},
    folders: {},
    tagProps: {},
  });
}

export function refreshAccount(doc: Y.Doc) {
  applyAccountView({ ownAccount: readAccount(doc), ready: true });
}

/** A shared space's doc changed (or is gone: null). */
export function refreshSpaceDoc(spaceId: string, doc: Y.Doc | null) {
  const spaceDocs = { ...useWorkspace.getState().spaceDocs };
  if (doc) spaceDocs[spaceId] = readSpaceDoc(doc, spaceId);
  else delete spaceDocs[spaceId];
  applyAccountView({ spaceDocs });
}

export function setSpaceAccess(spaceAccess: Record<string, SpaceAccess>) {
  applyAccountView({ spaceAccess });
}

function applyAccountView(patch: Partial<Pick<WorkspaceState, "ownAccount" | "spaceDocs" | "spaceAccess" | "ready">>) {
  const st = { ...useWorkspace.getState(), ...patch };
  const account = accountView(st.ownAccount, st.spaceDocs, st.spaceAccess);
  let activeSpaceId = st.activeSpaceId;
  // A member's shared space (D-62) joins the view only once its access is read: until then it is
  // still the active one if this account has it placed.
  const known = (id: string) => account.spaces.some((s) => s.id === id) || st.ownAccount.sharedSpaces.some((r) => r.spaceId === id && !st.spaceAccess[id]);
  if (st.ready && (!activeSpaceId || !known(activeSpaceId))) activeSpaceId = account.spaces[0]?.id ?? null;
  useWorkspace.setState({ ...patch, account, activeSpaceId });
}

/**
 * The account as shown (D-62): own spaces (a shared one marked so, this account its owner), the
 * shared spaces it is a member of after them, and the notebooks of every shared space from its
 * space doc — only those the server still lists, once known (document-model.md §2.2).
 */
export function accountView(own: AccountSnapshot, docs: Record<string, SpaceDocSnapshot>, access: Record<string, SpaceAccess>): AccountSnapshot {
  if (!Object.keys(docs).length && !own.sharedSpaces.length && !own.spaces.some((s) => (s as SpaceEntry).shared)) return own;
  const lastOwn = own.spaces.reduce((m, s) => Math.max(m, s.order), 0);
  const memberSpaces: SpaceEntry[] = own.sharedSpaces
    .filter((r) => access[r.spaceId] && access[r.spaceId]!.role !== "owner")
    .map((r, i) => {
      const doc = docs[r.spaceId];
      return {
        id: r.spaceId,
        name: doc?.name ?? "",
        icon: doc?.icon ?? null,
        color: doc?.color ?? null,
        order: lastOwn + 1 + i,
        createdAt: r.addedAt,
        shared: true,
        memberOf: true,
        role: access[r.spaceId]!.role,
      };
    });
  const spaces = [...own.spaces.map((s) => ((s as SpaceEntry).shared ? { ...s, role: "owner" as const } : s)), ...memberSpaces];
  const sharedIds = new Set(spaces.filter((s) => s.shared).map((s) => s.id));
  const fromDocs = Object.entries(docs).flatMap(([spaceId, d]) => {
    if (!sharedIds.has(spaceId)) return [];
    const listed = access[spaceId]?.notebookIds;
    return listed ? d.notebooks.filter((n) => listed.includes(n.id)) : d.notebooks;
  });
  const inDocs = new Set(fromDocs.map((n) => n.id));
  return { ...own, spaces, notebooks: [...own.notebooks.filter((n) => !inDocs.has(n.id)), ...fromDocs] };
}

/** This account's role in the shared space a document (space doc, index or note) belongs to (D-62). */
export function spaceRoleOfDoc(st: WorkspaceState, docId: string): SpaceAccess["role"] | null {
  if (st.spaceAccess[docId]) return st.spaceAccess[docId]!.role;
  const nb = st.notes[docId]?.notebookId ?? docId;
  const spaceId = st.account.notebooks.find((n) => n.id === nb)?.spaceId;
  return (spaceId && st.spaceAccess[spaceId]?.role) || null;
}

/** The shared space a notebook belongs to (D-62), or null for an own personal one. */
export function sharedSpaceOfNotebook(st: WorkspaceState, notebookId: string | undefined): SpaceEntry | null {
  const spaceId = st.account.notebooks.find((n) => n.id === notebookId)?.spaceId;
  const space = st.account.spaces.find((s) => s.id === spaceId);
  return space?.shared ? space : null;
}

export function refreshNotebook(notebookId: string, doc: Y.Doc | null) {
  const st = useWorkspace.getState();
  const notebooksData = { ...st.notebooksData };
  if (doc) notebooksData[notebookId] = readNotebook(doc);
  else delete notebooksData[notebookId];
  rebuild(notebooksData, st.standaloneNotes);
}

/** A note shared on its own (D-54): its entry comes from the note document, not from an index. */
export function refreshStandaloneNote(noteId: string, entry: NoteEntry | null) {
  const st = useWorkspace.getState();
  const standaloneNotes = { ...st.standaloneNotes };
  if (entry) standaloneNotes[noteId] = entry;
  else delete standaloneNotes[noteId];
  rebuild(st.notebooksData, standaloneNotes);
}

function rebuild(notebooksData: Record<string, NotebookSnapshot>, standaloneNotes: Record<string, NoteEntry>) {
  const st = useWorkspace.getState();
  const notes: Record<string, NoteEntry> = {};
  const folders: Record<string, FolderEntry> = {};
  const tagProps: Record<string, TagProps> = {};
  // Structural sharing: unchanged entries keep their identity so memoised rows skip
  // re-rendering, and an unchanged map keeps its identity so its subscribers do too.
  let notesChanged = false;
  let foldersChanged = false;
  for (const [nbId, data] of Object.entries(notebooksData)) {
    for (const n of data.notes) {
      const next: NoteEntry = { ...n, tags: n.tags ?? [], notebookId: nbId };
      const prev = st.notes[n.id];
      notes[n.id] = prev && sameEntry(prev, next) ? prev : next;
      if (notes[n.id] !== prev) notesChanged = true;
    }
    for (const f of data.folders) {
      const next: FolderEntry = { ...f, notebookId: nbId };
      const prev = st.folders[f.id];
      folders[f.id] = prev && sameEntry(prev, next) ? prev : next;
      if (folders[f.id] !== prev) foldersChanged = true;
    }
    Object.assign(tagProps, data.tags);
  }
  for (const [id, next] of Object.entries(standaloneNotes)) {
    if (notes[id]) continue;
    const prev = st.notes[id];
    notes[id] = prev && sameEntry(prev, next) ? prev : next;
    if (notes[id] !== prev) notesChanged = true;
  }
  if (Object.keys(notes).length !== Object.keys(st.notes).length) notesChanged = true;
  if (Object.keys(folders).length !== Object.keys(st.folders).length) foldersChanged = true;
  useWorkspace.setState({
    notebooksData,
    standaloneNotes,
    notes: notesChanged ? notes : st.notes,
    folders: foldersChanged ? folders : st.folders,
    tagProps,
  });
}

/** Shallow equality of two records whose values are JSON (arrays/objects compared by content). */
function sameEntry(a: object, b: object): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) {
    const x = (a as Record<string, unknown>)[k];
    const y = (b as Record<string, unknown>)[k];
    if (x === y) continue;
    if (typeof x !== "object" || typeof y !== "object" || x === null || y === null) return false;
    if (JSON.stringify(x) !== JSON.stringify(y)) return false;
  }
  return true;
}

// ---------- selectors ----------

export function spaceNotebooks(st: WorkspaceState, spaceId: string | null): NotebookRef[] {
  return st.account.notebooks.filter((n) => n.spaceId === spaceId);
}

export function activeSpace(st: WorkspaceState): SpaceEntry | undefined {
  return st.account.spaces.find((s) => s.id === st.activeSpaceId);
}

type SpaceAccount = Pick<AccountSnapshot, "notebooks" | "shared" | "spaces">;

/**
 * The space whose «Общие со мной» shows a shared notebook or note (D-54): its placement, or the
 * first space once that space is gone (a deleted space must not hide what is shared).
 */
export function sharedRefSpace(account: Pick<AccountSnapshot, "spaces">, ref: SharedRef): string | null {
  return account.spaces.some((s) => s.id === ref.spaceId) ? ref.spaceId : (account.spaces[0]?.id ?? null);
}

/** The space a notebook belongs to (D-48: membership is derived from the notebook). */
export function spaceOfNotebook(st: WorkspaceState, notebookId: string | undefined): string | null {
  // Own notebooks; a notebook shared with this account lives where «Общие со мной» puts it (D-54).
  const own = st.account.notebooks.find((n) => n.id === notebookId);
  if (own) return own.spaceId;
  const ref = st.account.shared.find((r) => r.kind === "notebook" && r.id === notebookId);
  return ref ? sharedRefSpace(st.account, ref) : null;
}

export function spaceOfNote(st: WorkspaceState, noteId: string): string | null {
  const ref = st.account.shared.find((r) => r.kind === "note" && r.id === noteId);
  return spaceOfNotebook(st, st.notes[noteId]?.notebookId) ?? (ref ? sharedRefSpace(st.account, ref) : null);
}

/**
 * A notebook by id: an own one, or one shared with this account (D-54) titled from its
 * meta and placed where «Общие со мной» puts it. Use with `useShallow`.
 */
export function findNotebook(st: WorkspaceState, notebookId: string | undefined): NotebookRef | undefined {
  if (!notebookId) return undefined;
  const own = st.account.notebooks.find((n) => n.id === notebookId);
  if (own) return own;
  const ref = st.account.shared.find((r) => r.kind === "notebook" && r.id === notebookId);
  const data = st.notebooksData[notebookId];
  if (!ref || !data) return undefined;
  return { id: notebookId, spaceId: ref.spaceId, name: data.name ?? "", icon: data.icon, color: null, order: ref.order, mode: "private", createdAt: ref.addedAt };
}

/** The resource a document belongs to if it is shared with this account (D-54), else null. */
export function sharedRefOf(st: WorkspaceState, noteId: string) {
  const nb = st.notes[noteId]?.notebookId;
  return st.account.shared.find((r) => (r.kind === "note" ? r.id === noteId : r.id === nb)) ?? null;
}

/** Whether a starred item belongs to a space (D-48: everything shown is of the current space). */
export function starredInSpace(st: WorkspaceState, ref: StarredRef, spaceId: string | null): boolean {
  const nb = ref.kind === "note" ? st.notes[ref.id]?.notebookId : ref.kind === "folder" ? st.folders[ref.id]?.notebookId : ref.id;
  return !!nb && spaceOfNotebook(st, nb) === spaceId;
}

/** Open tabs of a space, in order (the account keeps one list for all spaces). */
export function tabsInSpace(st: WorkspaceState, spaceId: string | null): TabEntry[] {
  return st.account.tabs.filter((t) => {
    const n = st.notes[t.noteId];
    return n && !n.trashedAt && spaceOfNote(st, n.id) === spaceId;
  });
}

/** `settings` map keyed by space (`activeTabBySpace`, `dailyNotebookBySpace`; document-model.md §2). */
export function bySpace(st: WorkspaceState, key: "activeTabBySpace" | "dailyNotebookBySpace"): Record<string, string> {
  const v = st.account.settings[key];
  return v && typeof v === "object" ? (v as Record<string, string>) : {};
}

/** Own notebooks of a space: its trash and its daily notes come only from these. */
export function ownNotebookIds(account: Pick<AccountSnapshot, "notebooks">, spaceId: string | null): Set<string> {
  return new Set(account.notebooks.filter((n) => n.spaceId === spaceId).map((n) => n.id));
}

/**
 * Which notes a space lists (D-48) — All documents, tags, starred, search, tasks: those of its own
 * notebooks and of what «Общие со мной» shows in it (shared notebooks and notes, D-54). Shared
 * notebooks are not in `account.notebooks`; lists that took only those left a shared notebook's
 * notes out of «Все документы» (prod 2026-11-02, as iOS before build 25).
 */
export function spaceNoteFilter(account: SpaceAccount, spaceId: string | null): (n: NoteEntry) => boolean {
  const notebooks = ownNotebookIds(account, spaceId);
  const notes = new Set<string>();
  for (const ref of account.shared) if (sharedRefSpace(account, ref) === spaceId) (ref.kind === "notebook" ? notebooks : notes).add(ref.id);
  return (n) => notebooks.has(n.notebookId) || notes.has(n.id);
}

/** `spaceNoteFilter` of the active space, recomputed only when the account's lists change. */
export function useSpaceNoteFilter(): (n: NoteEntry) => boolean {
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const shared = useWorkspace((s) => s.account.shared);
  const spaces = useWorkspace((s) => s.account.spaces);
  return useMemo(() => spaceNoteFilter({ notebooks, shared, spaces }, spaceId), [notebooks, shared, spaces, spaceId]);
}

export function notesInSpace(st: WorkspaceState, spaceId: string | null): NoteEntry[] {
  return Object.values(st.notes).filter(spaceNoteFilter(st.account, spaceId));
}

export function visibleNotes(notes: NoteEntry[]): NoteEntry[] {
  return notes.filter((n) => !n.trashedAt && n.kind !== "inbox");
}

const countsCache = new WeakMap<Record<string, NoteEntry>, Map<string, number>>();
/** Live documents per folder, computed once per `notes` snapshot. */
export function folderCounts(notes: Record<string, NoteEntry>): Map<string, number> {
  let counts = countsCache.get(notes);
  if (!counts) {
    counts = new Map();
    for (const n of Object.values(notes)) if (n.folderId && !n.trashedAt) counts.set(n.folderId, (counts.get(n.folderId) ?? 0) + 1);
    countsCache.set(notes, counts);
  }
  return counts;
}

export function isStarred(st: WorkspaceState, ref: StarredRef): boolean {
  return st.account.starred.some((s) => s.kind === ref.kind && s.id === ref.id);
}

export function folderPath(st: WorkspaceState, folderId: string | null): FolderEntry[] {
  const out: FolderEntry[] = [];
  let cur = folderId ? st.folders[folderId] : undefined;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.unshift(cur);
    cur = cur.parentId ? st.folders[cur.parentId] : undefined;
  }
  return out;
}

export function allTags(st: WorkspaceState, spaceId: string | null): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const n of visibleNotes(notesInSpace(st, spaceId))) for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

export function noteTitle(n: Pick<NoteMeta, "title" | "kind" | "dailyDate"> | undefined, untitled: string): string {
  if (!n) return untitled;
  if (n.title.trim()) return n.title;
  if (n.kind === "daily" && n.dailyDate) return n.dailyDate;
  return untitled;
}
