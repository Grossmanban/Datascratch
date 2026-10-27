// Typed accessors for the map-of-records parts of account and notebook
// documents. Each record is a nested Y.Map so concurrent edits of different
// fields merge (rename on one device + move on another keep both).
import * as Y from "yjs";
import type {
  AccountSettings,
  Folder,
  NoteMeta,
  NotebookRef,
  SharedRef,
  Space,
  StarredItem,
  TabItem,
  TagProps,
} from "../contracts/document.js";
import { sharedRefKey } from "../contracts/document.js";
import { accountRoots, notebookRoots } from "./factories.js";
import { readRecord, readRecords, writeRecord } from "./yjs.js";

function sortByOrder<T extends { order: number; id: string }>(items: T[]): T[] {
  return items.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function patchRecord<T extends { id: string }>(
  map: Y.Map<unknown>,
  id: string,
  patch: Partial<T>,
): boolean {
  if (!(map.get(id) instanceof Y.Map)) return false;
  writeRecord(map, id, { ...patch, id });
  return true;
}

// --- account --------------------------------------------------------------

export const getSpaces = (doc: Y.Doc): Space[] =>
  sortByOrder(readRecords<Space>(accountRoots(doc).spaces));
export const getSpace = (doc: Y.Doc, id: string) => readRecord<Space>(accountRoots(doc).spaces, id);
export const putSpace = (doc: Y.Doc, space: Space) =>
  void writeRecord(accountRoots(doc).spaces, space.id, space);
export const patchSpace = (doc: Y.Doc, id: string, patch: Partial<Space>) =>
  patchRecord(accountRoots(doc).spaces, id, patch);
export const deleteSpace = (doc: Y.Doc, id: string) => accountRoots(doc).spaces.delete(id);

export const getNotebookRefs = (doc: Y.Doc, spaceId?: string): NotebookRef[] =>
  sortByOrder(readRecords<NotebookRef>(accountRoots(doc).notebooks)).filter(
    (n) => spaceId === undefined || n.spaceId === spaceId,
  );
export const getNotebookRef = (doc: Y.Doc, id: string) =>
  readRecord<NotebookRef>(accountRoots(doc).notebooks, id);
export const putNotebookRef = (doc: Y.Doc, ref: NotebookRef) =>
  void writeRecord(accountRoots(doc).notebooks, ref.id, ref);
export const patchNotebookRef = (doc: Y.Doc, id: string, patch: Partial<NotebookRef>) =>
  patchRecord(accountRoots(doc).notebooks, id, patch);
export const deleteNotebookRef = (doc: Y.Doc, id: string) => accountRoots(doc).notebooks.delete(id);

export function getSettings(doc: Y.Doc): AccountSettings {
  return accountRoots(doc).settings.toJSON() as AccountSettings;
}
export function setSetting(doc: Y.Doc, key: string, value: unknown): void {
  const settings = accountRoots(doc).settings;
  if (value === undefined) settings.delete(key);
  else settings.set(key, value);
}

/** «Общие со мной» placements (D-54), optionally of one space. */
export function getSharedRefs(doc: Y.Doc, spaceId?: string): SharedRef[] {
  return readRecords<SharedRef>(accountRoots(doc).shared)
    .filter((r) => spaceId === undefined || r.spaceId === spaceId)
    .sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
export const getSharedRef = (doc: Y.Doc, kind: SharedRef["kind"], id: string) =>
  readRecord<SharedRef>(accountRoots(doc).shared, sharedRefKey(kind, id));
export const putSharedRef = (doc: Y.Doc, ref: SharedRef) =>
  void writeRecord(accountRoots(doc).shared, sharedRefKey(ref.kind, ref.id), ref);
export const deleteSharedRef = (doc: Y.Doc, kind: SharedRef["kind"], id: string) =>
  accountRoots(doc).shared.delete(sharedRefKey(kind, id));

export const getStarred = (doc: Y.Doc): StarredItem[] =>
  accountRoots(doc).starred.toJSON() as StarredItem[];
export function setStarred(doc: Y.Doc, item: StarredItem, starred: boolean): void {
  const arr = accountRoots(doc).starred;
  doc.transact(() => {
    const items = arr.toArray() as StarredItem[];
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i]!.kind === item.kind && items[i]!.id === item.id) arr.delete(i, 1);
    }
    if (starred) arr.push([{ kind: item.kind, id: item.id }]);
  });
}

export const getTabs = (doc: Y.Doc): TabItem[] => accountRoots(doc).tabs.toJSON() as TabItem[];
export function openTab(doc: Y.Doc, noteId: string): void {
  doc.transact(() => {
    const tabs = accountRoots(doc).tabs;
    if (!(tabs.toArray() as TabItem[]).some((t) => t.noteId === noteId)) tabs.push([{ noteId }]);
    accountRoots(doc).settings.set("activeTab", noteId);
  });
}
export function closeTab(doc: Y.Doc, noteId: string): void {
  doc.transact(() => {
    const tabs = accountRoots(doc).tabs;
    const items = tabs.toArray() as TabItem[];
    for (let i = items.length - 1; i >= 0; i--) if (items[i]!.noteId === noteId) tabs.delete(i, 1);
    const settings = accountRoots(doc).settings;
    if (settings.get("activeTab") === noteId) {
      const rest = tabs.toArray() as TabItem[];
      settings.set("activeTab", rest.length > 0 ? rest[rest.length - 1]!.noteId : null);
    }
  });
}

// --- notebook -------------------------------------------------------------

export const getFolders = (doc: Y.Doc): Folder[] =>
  sortByOrder(readRecords<Folder>(notebookRoots(doc).folders));
export const getFolder = (doc: Y.Doc, id: string) =>
  readRecord<Folder>(notebookRoots(doc).folders, id);
export const putFolder = (doc: Y.Doc, folder: Folder) =>
  void writeRecord(notebookRoots(doc).folders, folder.id, folder);
export const patchFolder = (doc: Y.Doc, id: string, patch: Partial<Folder>) =>
  patchRecord(notebookRoots(doc).folders, id, patch);
export const deleteFolder = (doc: Y.Doc, id: string) => notebookRoots(doc).folders.delete(id);

export interface NoteMetaQuery {
  /** `undefined` = any folder, `null` = notebook root. */
  folderId?: string | null;
  includeTrashed?: boolean;
}

export function getNoteMetas(doc: Y.Doc, query: NoteMetaQuery = {}): NoteMeta[] {
  return sortByOrder(readRecords<NoteMeta>(notebookRoots(doc).notes)).filter(
    (n) =>
      (query.includeTrashed || n.trashedAt == null) &&
      (query.folderId === undefined || (n.folderId ?? null) === query.folderId),
  );
}
export const getNoteMeta = (doc: Y.Doc, id: string) =>
  readRecord<NoteMeta>(notebookRoots(doc).notes, id);
export const putNoteMeta = (doc: Y.Doc, meta: NoteMeta) =>
  void writeRecord(notebookRoots(doc).notes, meta.id, meta);
export const patchNoteMeta = (doc: Y.Doc, id: string, patch: Partial<NoteMeta>) =>
  patchRecord(notebookRoots(doc).notes, id, patch);
export const deleteNoteMeta = (doc: Y.Doc, id: string) => notebookRoots(doc).notes.delete(id);

/** The daily note of `date` (YYYY-MM-DD), if any, from the daily notebook's index. */
export function findDailyNote(doc: Y.Doc, date: string): NoteMeta | null {
  return getNoteMetas(doc).find((n) => n.kind === "daily" && n.dailyDate === date) ?? null;
}

/** Folder ids of `folderId` and all its descendants (for subtree queries and deletes). */
export function folderSubtree(doc: Y.Doc, folderId: string): string[] {
  const folders = getFolders(doc);
  const out = [folderId];
  for (let i = 0; i < out.length; i++) {
    for (const f of folders) if (f.parentId === out[i] && !out.includes(f.id)) out.push(f.id);
  }
  return out;
}

export function getTagProps(doc: Y.Doc): Record<string, TagProps> {
  return notebookRoots(doc).tags.toJSON() as Record<string, TagProps>;
}
export const putTagProps = (doc: Y.Doc, name: string, props: TagProps) =>
  void writeRecord(notebookRoots(doc).tags, name, props);
