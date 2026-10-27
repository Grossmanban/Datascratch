import { create } from "zustand";
import type * as Y from "yjs";
import type { Folder, NoteMeta, NotebookRef, Space, StarredRef } from "@/lib/shared";
import { readAccount, type AccountSnapshot, type TabEntry } from "./account";
import { readNotebook, type NotebookSnapshot, type TagProps } from "./notebook";

export type NoteEntry = NoteMeta & { notebookId: string };
export type FolderEntry = Folder & { notebookId: string };

export type WorkspaceState = {
  ready: boolean;
  /** Account doc has synced at least once (or was created here). */
  accountSynced: boolean;
  account: AccountSnapshot;
  notebooksData: Record<string, NotebookSnapshot>;
  /** Notes shared with this account on their own, without their notebook (D-54); `notebookId` is "". */
  standaloneNotes: Record<string, NoteEntry>;
  notes: Record<string, NoteEntry>;
  folders: Record<string, FolderEntry>;
  tagProps: Record<string, TagProps>;
  activeSpaceId: string | null;
};

const emptyAccount: AccountSnapshot = { formatVersion: 1, spaces: [], notebooks: [], settings: {}, starred: [], tabs: [], shared: [] };

export const useWorkspace = create<WorkspaceState>(() => ({
  ready: false,
  accountSynced: false,
  account: emptyAccount,
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
    notebooksData: {},
    standaloneNotes: {},
    notes: {},
    folders: {},
    tagProps: {},
  });
}

export function refreshAccount(doc: Y.Doc) {
  const account = readAccount(doc);
  const st = useWorkspace.getState();
  let activeSpaceId = st.activeSpaceId;
  if (!activeSpaceId || !account.spaces.some((s) => s.id === activeSpaceId)) activeSpaceId = account.spaces[0]?.id ?? null;
  useWorkspace.setState({ account, activeSpaceId, ready: true });
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

export function activeSpace(st: WorkspaceState): Space | undefined {
  return st.account.spaces.find((s) => s.id === st.activeSpaceId);
}

/** The space a notebook belongs to (D-48: membership is derived from the notebook). */
export function spaceOfNotebook(st: WorkspaceState, notebookId: string | undefined): string | null {
  // Own notebooks; a notebook shared with this account lives where «Общие со мной» puts it (D-54).
  return (
    st.account.notebooks.find((n) => n.id === notebookId)?.spaceId ??
    st.account.shared.find((r) => r.kind === "notebook" && r.id === notebookId)?.spaceId ??
    null
  );
}

export function spaceOfNote(st: WorkspaceState, noteId: string): string | null {
  return (
    spaceOfNotebook(st, st.notes[noteId]?.notebookId) ?? st.account.shared.find((r) => r.kind === "note" && r.id === noteId)?.spaceId ?? null
  );
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

export function notesInSpace(st: WorkspaceState, spaceId: string | null): NoteEntry[] {
  const nbs = new Set(spaceNotebooks(st, spaceId).map((n) => n.id));
  return Object.values(st.notes).filter((n) => nbs.has(n.notebookId));
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
