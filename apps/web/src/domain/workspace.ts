import { create } from "zustand";
import type * as Y from "yjs";
import type { Folder, NoteMeta, NotebookRef, Space, StarredRef } from "@/lib/shared";
import { readAccount, type AccountSnapshot } from "./account";
import { readNotebook, type NotebookSnapshot, type TagProps } from "./notebook";

export type NoteEntry = NoteMeta & { notebookId: string };
export type FolderEntry = Folder & { notebookId: string };

export type WorkspaceState = {
  ready: boolean;
  /** Account doc has synced at least once (or was created here). */
  accountSynced: boolean;
  account: AccountSnapshot;
  notebooksData: Record<string, NotebookSnapshot>;
  notes: Record<string, NoteEntry>;
  folders: Record<string, FolderEntry>;
  tagProps: Record<string, TagProps>;
  activeSpaceId: string | null;
};

const emptyAccount: AccountSnapshot = { formatVersion: 1, spaces: [], notebooks: [], settings: {}, starred: [], tabs: [] };

export const useWorkspace = create<WorkspaceState>(() => ({
  ready: false,
  accountSynced: false,
  account: emptyAccount,
  notebooksData: {},
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
  const notes: Record<string, NoteEntry> = {};
  const folders: Record<string, FolderEntry> = {};
  const tagProps: Record<string, TagProps> = {};
  for (const [nbId, data] of Object.entries(notebooksData)) {
    for (const n of data.notes) notes[n.id] = { ...n, tags: n.tags ?? [], notebookId: nbId };
    for (const f of data.folders) folders[f.id] = { ...f, notebookId: nbId };
    Object.assign(tagProps, data.tags);
  }
  useWorkspace.setState({ notebooksData, notes, folders, tagProps });
}

// ---------- selectors ----------

export function spaceNotebooks(st: WorkspaceState, spaceId: string | null): NotebookRef[] {
  return st.account.notebooks.filter((n) => n.spaceId === spaceId);
}

export function activeSpace(st: WorkspaceState): Space | undefined {
  return st.account.spaces.find((s) => s.id === st.activeSpaceId);
}

export function notesInSpace(st: WorkspaceState, spaceId: string | null): NoteEntry[] {
  const nbs = new Set(spaceNotebooks(st, spaceId).map((n) => n.id));
  return Object.values(st.notes).filter((n) => nbs.has(n.notebookId));
}

export function visibleNotes(notes: NoteEntry[]): NoteEntry[] {
  return notes.filter((n) => !n.trashedAt && n.kind !== "inbox");
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
