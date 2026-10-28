import { NetworkError } from "@/api/client";
import * as Y from "yjs";
import { docsApi, notebooksModeApi } from "@/api/endpoints";
import { getMasterKey } from "@/auth/session";
import { cachedNoteKey, notebookKey, rememberNotebookKey, rememberNoteKey, serverNotebookKey } from "@/data/keys";
import { enqueueOp } from "@/data/ops";
import { runtime } from "@/data/runtime";
import {
  ad,
  randomKey,
  toBase64Url,
  uuidv7,
  wrapKey,
  type Folder,
  type NoteKind,
  type NoteMeta,
  type NotebookMode,
  type NotebookRef,
  type Space,
  type StarredRef,
  moveNoteToNotebook,
} from "@/lib/shared";
import { formatLongDate } from "@/lib/dates";
import { accountMaps } from "./account";
import { initNotebookDoc, notebookMaps } from "./notebook";
import { appendTask, initNoteDoc, removeTask, setTaskText, setTitle, updateTask, type TaskPatch } from "./note";
import { bySpace, spaceOfNote, spaceOfNotebook, tabsInSpace, useWorkspace } from "./workspace";
import { forgetClosedTab, recordClosedTabs, tabsEpoch } from "@/lib/closedTabs";
import { features } from "@/lib/features";
import { orderBetween, patchYMap, toYMap } from "./ymap";

const now = () => new Date().toISOString();
const acc = () => accountMaps(runtime().account);

function nextOrder(items: { order: number }[]): number {
  return items.length ? Math.max(...items.map((i) => i.order)) + 1 : 1;
}

// ---------- spaces ----------

export function createSpace(input: { name: string; icon?: string; color?: string }): string {
  const id = uuidv7();
  const space: Space = {
    id,
    name: input.name,
    icon: input.icon ?? "📁",
    color: input.color ?? "tint.blue",
    order: nextOrder(useWorkspace.getState().account.spaces),
    createdAt: now(),
  };
  acc().spaces.set(id, toYMap(space));
  return id;
}

export function updateSpace(id: string, patch: Partial<Omit<Space, "id">>) {
  const m = acc().spaces.get(id);
  if (m) patchYMap(m, patch);
}

export function deleteSpace(id: string): boolean {
  const st = useWorkspace.getState();
  if (st.account.notebooks.some((n) => n.spaceId === id) || st.account.spaces.length <= 1) return false;
  acc().spaces.delete(id);
  return true;
}

// ---------- notebooks ----------

export async function createNotebook(input: {
  spaceId: string;
  name: string;
  mode?: NotebookMode;
  icon?: string;
  color?: string;
}): Promise<string> {
  const rt = runtime();
  const id = uuidv7();
  const mode = input.mode ?? "private";
  const key = randomKey();
  const wrapped = await wrapKey(getMasterKey(), key, ad.notebookKey(id));
  rememberNotebookKey(id, key, wrapped);
  await enqueueOp({
    method: "POST",
    path: "/notebooks",
    body: { notebookId: id, mode, wrappedKey: wrapped, ...(mode === "agent" ? { notebookKey: toBase64Url(key) } : {}) },
  });
  await rt.store.create(id, "notebook", null, (doc) => initNotebookDoc(doc, id));
  const ref: NotebookRef = {
    id,
    spaceId: input.spaceId,
    name: input.name,
    icon: input.icon ?? "📓",
    color: input.color ?? "tint.gray",
    order: nextOrder(useWorkspace.getState().account.notebooks.filter((n) => n.spaceId === input.spaceId)),
    mode,
    createdAt: now(),
  };
  acc().notebooks.set(id, toYMap(ref));
  // The first notebook of a space keeps that space's daily notes and Inbox (D-48).
  if ((features.calendar || features.tasks) && !bySpace(useWorkspace.getState(), "dailyNotebookBySpace")[input.spaceId]) setBySpace("dailyNotebookBySpace", input.spaceId, id);
  return id;
}

export function updateNotebook(id: string, patch: Partial<Pick<NotebookRef, "name" | "icon" | "color" | "order" | "spaceId">>) {
  const m = acc().notebooks.get(id);
  if (m) patchYMap(m, patch);
}

/** Move a notebook to another space (an explicit command, D-48): it goes last there, with its notes. */
export function moveNotebookToSpace(id: string, spaceId: string) {
  const st = useWorkspace.getState();
  updateNotebook(id, { spaceId, order: nextOrder(st.account.notebooks.filter((n) => n.spaceId === spaceId)) });
}

/** Needs the server: switching to "agent" hands the notebook key to it (crypto.md §8). */
export async function setNotebookMode(id: string, mode: NotebookMode) {
  await pushNotebookMode(id, mode);
  const m = acc().notebooks.get(id);
  m?.set("mode", mode);
}

/**
 * Tell the server a notebook's mode; for «для агентов» with the server's own copy of the key
 * (never a key only this device holds). Retried on network failures; the account doc is the
 * user's intent and the runtime reconciles the server with it again on every sync start.
 */
export async function pushNotebookMode(id: string, mode: NotebookMode) {
  for (let attempt = 0; ; attempt++) {
    try {
      let keyText: string | undefined;
      if (mode === "agent") {
        const key = await serverNotebookKey(id);
        if (!key) throw new Error("Notebook key unavailable");
        keyText = toBase64Url(key);
      }
      await notebooksModeApi.setMode(id, mode, keyText);
      return;
    } catch (e) {
      if (!(e instanceof NetworkError) || attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 500 * 3 ** attempt));
    }
  }
}

export async function deleteNotebook(id: string) {
  const st = useWorkspace.getState();
  const a = acc();
  runtime().account.transact(() => {
    a.notebooks.delete(id);
    const spaceId = spaceOfNotebook(st, id);
    if (spaceId && bySpace(st, "dailyNotebookBySpace")[spaceId] === id) {
      const other = st.account.notebooks.find((n) => n.id !== id && n.spaceId === spaceId);
      setBySpace("dailyNotebookBySpace", spaceId, other?.id ?? null);
    }
    removeStarredWhere(a.starred, (s) => (s.kind === "notebook" && s.id === id) || belongsTo(s, id));
    removeTabsWhere(a.tabs, (t) => st.notes[t.noteId]?.notebookId === id);
  });
  await enqueueOp({ method: "DELETE", path: `/notebooks/${id}` });
}

/**
 * A notebook or note no longer shared with this account (D-54: access closed, left, deleted by
 * its owner): its stars and tabs go (its placement is already gone from account.shared).
 */
export function forgetSharedResource(target: { kind: "notebook" | "note"; id: string }) {
  const st = useWorkspace.getState();
  const a = acc();
  const inIt = (noteId: string) => (target.kind === "note" ? noteId === target.id : st.notes[noteId]?.notebookId === target.id);
  runtime().account.transact(() => {
    removeStarredWhere(a.starred, (s) =>
      target.kind === "note" ? s.kind === "note" && s.id === target.id : (s.kind === "notebook" && s.id === target.id) || belongsTo(s, target.id),
    );
    removeTabsWhere(a.tabs, (t) => inIt(t.noteId));
  });
}

function belongsTo(s: StarredRef, notebookId: string): boolean {
  const st = useWorkspace.getState();
  if (s.kind === "note") return st.notes[s.id]?.notebookId === notebookId;
  if (s.kind === "folder") return st.folders[s.id]?.notebookId === notebookId;
  return false;
}

function removeStarredWhere(arr: Y.Array<StarredRef>, pred: (s: StarredRef) => boolean) {
  const items = arr.toArray();
  for (let i = items.length - 1; i >= 0; i--) if (pred(items[i]!)) arr.delete(i, 1);
}

function removeTabsWhere(arr: Y.Array<{ noteId: string }>, pred: (t: { noteId: string }) => boolean) {
  const items = arr.toArray();
  for (let i = items.length - 1; i >= 0; i--) if (pred(items[i]!)) arr.delete(i, 1);
}

function nbMaps(notebookId: string) {
  const doc = runtime().store.get(notebookId);
  if (!doc) throw new Error(`Notebook ${notebookId} is not loaded`);
  return { doc, ...notebookMaps(doc) };
}

// ---------- folders ----------

export function createFolder(input: { notebookId: string; parentId: string | null; name: string; icon?: string; color?: string }): string {
  const { folders } = nbMaps(input.notebookId);
  const id = uuidv7();
  const siblings = Object.values(useWorkspace.getState().folders).filter(
    (f) => f.notebookId === input.notebookId && f.parentId === input.parentId,
  );
  const folder: Folder = {
    id,
    parentId: input.parentId,
    name: input.name,
    icon: input.icon ?? "",
    color: input.color ?? "tint.gray",
    order: nextOrder(siblings),
    createdAt: now(),
  };
  folders.set(id, toYMap(folder));
  return id;
}

export function updateFolder(folderId: string, patch: Partial<Pick<Folder, "name" | "icon" | "color">>) {
  const f = useWorkspace.getState().folders[folderId];
  if (!f) return;
  const m = nbMaps(f.notebookId).folders.get(folderId);
  if (m) patchYMap(m, patch);
}

function isDescendant(folderId: string, maybeAncestor: string): boolean {
  const st = useWorkspace.getState();
  let cur = st.folders[folderId];
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    if (cur.id === maybeAncestor) return true;
    seen.add(cur.id);
    cur = cur.parentId ? st.folders[cur.parentId] : undefined;
  }
  return false;
}

/** Move a folder under `parentId` (null = notebook root), optionally before a sibling. */
export function moveFolder(folderId: string, parentId: string | null, beforeId?: string | null): boolean {
  const st = useWorkspace.getState();
  const f = st.folders[folderId];
  if (!f) return false;
  if (parentId && (parentId === folderId || isDescendant(parentId, folderId))) return false;
  if (parentId && st.folders[parentId]?.notebookId !== f.notebookId) return false;
  const siblings = Object.values(st.folders)
    .filter((x) => x.notebookId === f.notebookId && x.parentId === parentId && x.id !== folderId)
    .sort((a, b) => a.order - b.order);
  let order: number;
  if (beforeId) {
    const idx = siblings.findIndex((s) => s.id === beforeId);
    order = orderBetween(siblings[idx - 1]?.order, siblings[idx]?.order);
  } else order = orderBetween(siblings[siblings.length - 1]?.order, undefined);
  const m = nbMaps(f.notebookId).folders.get(folderId);
  m?.set("parentId", parentId);
  m?.set("order", order);
  return true;
}

/** Deletes the folder; its sub-folders and notes move up to its parent. */
export function deleteFolder(folderId: string) {
  const st = useWorkspace.getState();
  const f = st.folders[folderId];
  if (!f) return;
  const { doc, folders, notes } = nbMaps(f.notebookId);
  doc.transact(() => {
    for (const child of Object.values(st.folders)) if (child.parentId === folderId) folders.get(child.id)?.set("parentId", f.parentId);
    for (const n of Object.values(st.notes)) if (n.folderId === folderId) notes.get(n.id)?.set("folderId", f.parentId);
    folders.delete(folderId);
  });
  removeStarredWhere(acc().starred, (s) => s.kind === "folder" && s.id === folderId);
}

// ---------- notes ----------

export async function createNote(input: {
  notebookId: string;
  folderId?: string | null;
  title?: string;
  kind?: NoteKind;
  dailyDate?: string | null;
  parentNoteId?: string | null;
  body?: string[];
}): Promise<string> {
  const rt = runtime();
  const nbKey = await notebookKey(input.notebookId);
  if (!nbKey) throw new Error("Notebook key unavailable");
  const id = uuidv7();
  const key = randomKey();
  rememberNoteKey(id, key);
  const meta: NoteMeta = {
    id,
    folderId: input.folderId ?? null,
    parentNoteId: input.parentNoteId ?? null,
    title: input.title ?? "",
    kind: input.kind ?? "note",
    dailyDate: input.dailyDate ?? null,
    tags: [],
    icon: null,
    coverThumb: null,
    wrappedKey: await wrapKey(nbKey, key, ad.noteKey(id)),
    createdAt: now(),
    updatedAt: now(),
    trashedAt: null,
    order: Date.now(),
  };
  // Create the doc row (and its queued registration) before the index entry appears,
  // otherwise the index observer would mark it as already known to the server.
  await rt.store.create(id, "note", input.notebookId, (doc) => initNoteDoc(doc, { title: input.title, body: input.body }));
  const { notes } = nbMaps(input.notebookId);
  notes.set(id, toYMap(meta));
  return id;
}

export function updateNote(noteId: string, patch: Partial<Pick<NoteMeta, "icon" | "coverThumb" | "folderId" | "order" | "title" | "parentNoteId">>) {
  const n = useWorkspace.getState().notes[noteId];
  if (!n) return;
  const m = nbMaps(n.notebookId).notes.get(noteId);
  if (m) patchYMap(m, patch);
}

/** D-45: who created the note, when an agent did it entirely (NoteMeta.createdByAgent). */
export type AgentCreated = { agentId: string; agentName: string; at: string };

export function agentCreatedOf(note: object | undefined): AgentCreated | null {
  const v = (note as { createdByAgent?: AgentCreated | null } | undefined)?.createdByAgent;
  return v && typeof v.agentName === "string" ? v : null;
}

/** «Понятно» on the «Создано агентом» strip: cleared for every device (D-45). */
export function acknowledgeAgentCreated(noteId: string) {
  const n = useWorkspace.getState().notes[noteId];
  if (!n) return;
  nbMaps(n.notebookId).notes.get(noteId)?.set("createdByAgent", null);
}

export function moveNote(noteId: string, folderId: string | null) {
  const st = useWorkspace.getState();
  const n = st.notes[noteId];
  if (!n) return false;
  if (folderId && st.folders[folderId]?.notebookId !== n.notebookId) return false;
  nbMaps(n.notebookId).notes.get(noteId)?.set("folderId", folderId);
  return true;
}

/**
 * Move a note into another notebook (api.md «Перенос заметки»). Needs the network:
 * the server must accept the PATCH before the note leaves the source index.
 * Nested notes stay in the source notebook and move up to its root level.
 */
export async function moveNoteToOtherNotebook(noteId: string, toNotebookId: string, toFolderId: string | null = null) {
  const st = useWorkspace.getState();
  const n = st.notes[noteId];
  if (!n || n.notebookId === toNotebookId) return;
  const fromNotebookId = n.notebookId;
  const [fromKey, toKey] = await Promise.all([notebookKey(fromNotebookId), notebookKey(toNotebookId)]);
  if (!fromKey || !toKey) throw new Error("notebook key unavailable");
  const store = runtime().store;
  const [fromIndex, toIndex] = await Promise.all([store.load(fromNotebookId), store.load(toNotebookId)]);
  await moveNoteToNotebook({
    noteId,
    fromIndex,
    toIndex,
    fromNotebookKey: fromKey,
    toNotebookKey: toKey,
    toNotebookId,
    toFolderId,
    patchDoc: (id, notebookId) => docsApi.move(id, notebookId),
  });
  await store.patchRow(noteId, { notebookId: toNotebookId });
  fromIndex.transact(() => {
    for (const m of notebookMaps(fromIndex).notes.values()) if (m.get("parentNoteId") === noteId) m.set("parentNoteId", null);
  });
  runtime().indexer.schedule(noteId, 50);
}

export function trashNote(noteId: string) {
  const n = useWorkspace.getState().notes[noteId];
  if (!n) return;
  nbMaps(n.notebookId).notes.get(noteId)?.set("trashedAt", now());
  closeTab(noteId);
}

export function restoreNote(noteId: string) {
  const n = useWorkspace.getState().notes[noteId];
  if (!n) return;
  nbMaps(n.notebookId).notes.get(noteId)?.set("trashedAt", null);
  runtime().indexer.schedule(noteId, 50);
}

export async function deleteNoteForever(noteId: string) {
  const n = useWorkspace.getState().notes[noteId];
  if (!n) return;
  nbMaps(n.notebookId).notes.delete(noteId);
  removeStarredWhere(acc().starred, (s) => s.kind === "note" && s.id === noteId);
  closeTab(noteId);
  await enqueueOp({ method: "DELETE", path: `/docs/${noteId}` });
}

/** Trash entries older than 30 days are deleted for good (spec/10-sync.md). */
export async function purgeOldTrash() {
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  for (const n of Object.values(useWorkspace.getState().notes))
    if (n.trashedAt && Date.parse(n.trashedAt) < cutoff) await deleteNoteForever(n.id);
}

export async function duplicateNote(noteId: string): Promise<string | null> {
  const n = useWorkspace.getState().notes[noteId];
  if (!n) return null;
  const rt = runtime();
  const src = await rt.store.acquire(noteId);
  try {
    const id = await createNote({ notebookId: n.notebookId, folderId: n.folderId, title: n.title });
    const target = await rt.store.acquire(id);
    try {
      const { restoreFrom } = await import("./note");
      restoreFrom(target, src);
    } finally {
      rt.store.release(id);
    }
    return id;
  } finally {
    rt.store.release(noteId);
  }
}

// ---------- starred & tabs ----------

export function toggleStar(ref: StarredRef) {
  const arr = acc().starred;
  const items = arr.toArray();
  const idx = items.findIndex((s) => s.kind === ref.kind && s.id === ref.id);
  if (idx >= 0) arr.delete(idx, 1);
  else arr.push([ref]);
}

/** Set one space's entry of a by-space settings key (D-48); null removes it. */
function setBySpace(key: "activeTabBySpace" | "dailyNotebookBySpace", spaceId: string, value: string | null) {
  const cur = { ...((acc().settings.get(key) as Record<string, string> | undefined) ?? {}) };
  if (cur[spaceId] === (value ?? undefined)) return;
  if (value) cur[spaceId] = value;
  else delete cur[spaceId];
  acc().settings.set(key, cur);
}

const OPENED_AT_EVERY_MS = 60 * 60 * 1000;

export function openTab(noteId: string) {
  // A minimal build (D-51) has no tabs and never writes the tab keys of the account document.
  if (!features.tabs) return;
  const a = acc();
  const spaceId = spaceOfNote(useWorkspace.getState(), noteId);
  const items = a.tabs.toArray();
  const idx = items.findIndex((t) => t.noteId === noteId);
  const nowIso = new Date().toISOString();
  runtime().account.transact(() => {
    if (idx < 0) a.tabs.push([{ noteId, openedAt: nowIso }]);
    else {
      // When the tab was last made active, for the quiet tidy-up; at most once an hour (document-model §2).
      const cur = items[idx]!;
      if (!cur.openedAt || Date.now() - Date.parse(cur.openedAt) > OPENED_AT_EVERY_MS) {
        a.tabs.delete(idx, 1);
        a.tabs.insert(idx, [{ ...cur, openedAt: nowIso }]);
      }
    }
    if (spaceId) setBySpace("activeTabBySpace", spaceId, noteId);
  });
  if (spaceId) forgetClosedTab(spaceId, noteId);
}

/** Close a tab; returns the tab of the same space to show next (tabs are per space, D-48). */
export function closeTab(noteId: string): string | null {
  if (!features.tabs) return null;
  const a = acc();
  const st = useWorkspace.getState();
  const spaceId = spaceOfNote(st, noteId);
  const items = a.tabs.toArray();
  const idx = items.findIndex((t) => t.noteId === noteId);
  if (idx < 0) return null;
  const same = tabsInSpace(st, spaceId);
  const at = same.findIndex((t) => t.noteId === noteId);
  const next = at < 0 ? null : (same[at + 1]?.noteId ?? same[at - 1]?.noteId ?? null);
  runtime().account.transact(() => {
    a.tabs.delete(idx, 1);
    if (spaceId && bySpace(st, "activeTabBySpace")[spaceId] === noteId) setBySpace("activeTabBySpace", spaceId, next);
  });
  if (spaceId) recordClosedTabs(spaceId, [noteId]);
  return next;
}

/** «Закрыть остальные»: every other tab of the space goes to «Недавно закрытые». */
export function closeOtherTabs(keepId: string) {
  if (!features.tabs) return;
  const a = acc();
  const st = useWorkspace.getState();
  const spaceId = spaceOfNote(st, keepId);
  if (!spaceId) return;
  // Pinned tabs stay (spec/12 §12.6).
  const others = new Set(tabsInSpace(st, spaceId).filter((t) => !t.pinned && t.noteId !== keepId).map((t) => t.noteId));
  if (!others.size) return;
  runtime().account.transact(() => {
    for (let i = a.tabs.length - 1; i >= 0; i--) if (others.has(a.tabs.get(i).noteId)) a.tabs.delete(i, 1);
    setBySpace("activeTabBySpace", spaceId, keepId);
  });
  recordClosedTabs(spaceId, [...others]);
}

/** Pin or unpin a tab: pinned tabs sit compact on the left and are never tidied or closed with the others. */
export function setTabPinned(noteId: string, pinned: boolean) {
  if (!features.tabs) return;
  const a = acc();
  const items = a.tabs.toArray();
  const idx = items.findIndex((t) => t.noteId === noteId);
  if (idx < 0) return;
  const { pinned: _, ...rest } = items[idx]!;
  void _;
  runtime().account.transact(() => {
    a.tabs.delete(idx, 1);
    a.tabs.insert(idx, [pinned ? { ...rest, pinned: true } : rest]);
  });
}

export const TAB_TIDY_DEFAULT = 7;

/** `settings.tabTidyDays`: 1 | 7 | 30, or null for never (default 7). */
export function tabTidyDays(): number | null {
  const v = useWorkspace.getState().account.settings.tabTidyDays;
  return v === null ? null : typeof v === "number" && v > 0 ? v : TAB_TIDY_DEFAULT;
}

/**
 * Quiet tidy-up (spec/12 §12.6): tabs not opened for `tabTidyDays` go to «Недавно закрытые».
 * Never pinned tabs, a space's active tab, or the document on screen. A tab without `openedAt`
 * counts as opened when this version first ran on this device.
 */
export function tidyTabs(shownNoteId: string | null, now = Date.now()) {
  if (!features.tabs) return;
  const days = tabTidyDays();
  if (days === null) return;
  const st = useWorkspace.getState();
  const active = new Set(Object.values(bySpace(st, "activeTabBySpace")));
  const epoch = tabsEpoch();
  const cutoff = now - days * 86_400_000;
  const stale = st.account.tabs.filter(
    (t) => !t.pinned && t.noteId !== shownNoteId && !active.has(t.noteId) && (t.openedAt ? Date.parse(t.openedAt) : epoch) < cutoff,
  );
  if (!stale.length) return;
  const ids = new Set(stale.map((t) => t.noteId));
  const a = acc();
  runtime().account.transact(() => {
    for (let i = a.tabs.length - 1; i >= 0; i--) if (ids.has(a.tabs.get(i).noteId)) a.tabs.delete(i, 1);
  });
  const bySpaceIds = new Map<string, string[]>();
  for (const t of stale) {
    const sp = spaceOfNote(st, t.noteId);
    if (sp) bySpaceIds.set(sp, [...(bySpaceIds.get(sp) ?? []), t.noteId]);
  }
  for (const [sp, list] of bySpaceIds) recordClosedTabs(sp, list);
}

/** The tab a space was left on, if it is still open (restored when switching back, D-48). */
export function activeTabOf(spaceId: string): string | null {
  if (!features.tabs) return null;
  const st = useWorkspace.getState();
  const id = bySpace(st, "activeTabBySpace")[spaceId];
  return id && tabsInSpace(st, spaceId).some((t) => t.noteId === id) ? id : (tabsInSpace(st, spaceId)[0]?.noteId ?? null);
}

/**
 * D-48 migration: the account-wide `activeTab` / `dailyNotebookId` of older clients belong to the
 * space of their note / notebook. Written once per space (only while that space has no entry);
 * the legacy keys are left for older clients and never written again.
 */
export function migrateSpaceSettings() {
  // Only the extended mode uses (and writes) these keys (D-51: a minimal build changes no data).
  if (!features.tabs && !features.calendar) return;
  const st = useWorkspace.getState();
  const legacyDaily = st.account.settings.dailyNotebookId as string | undefined;
  const dailySpace = legacyDaily ? spaceOfNotebook(st, legacyDaily) : null;
  const legacyTab = st.account.settings.activeTab as string | undefined;
  const tabSpace = legacyTab ? spaceOfNote(st, legacyTab) : null;
  const daily = dailySpace && !bySpace(st, "dailyNotebookBySpace")[dailySpace];
  const tab = tabSpace && !bySpace(st, "activeTabBySpace")[tabSpace];
  if (!daily && !tab) return;
  runtime().account.transact(() => {
    if (daily) setBySpace("dailyNotebookBySpace", dailySpace, legacyDaily!);
    if (tab) setBySpace("activeTabBySpace", tabSpace, legacyTab!);
  });
}

export function reorderTab(noteId: string, toIndex: number) {
  const a = acc();
  const items = a.tabs.toArray();
  const idx = items.findIndex((t) => t.noteId === noteId);
  if (idx < 0) return;
  runtime().account.transact(() => {
    a.tabs.delete(idx, 1);
    a.tabs.insert(Math.min(toIndex, a.tabs.length), [{ noteId }]);
  });
}

export function setSetting(key: string, value: unknown) {
  acc().settings.set(key, value);
}

// ---------- daily notes & inbox ----------

/** The notebook holding the daily notes and the Inbox of a space (default: the current one; D-48). */
export function dailyNotebookId(spaceId: string | null = useWorkspace.getState().activeSpaceId): string | null {
  const st = useWorkspace.getState();
  const inSpace = st.account.notebooks.filter((n) => n.spaceId === spaceId);
  const id = spaceId ? bySpace(st, "dailyNotebookBySpace")[spaceId] : undefined;
  if (id && inSpace.some((n) => n.id === id)) return id;
  // Not migrated yet: the legacy account-wide notebook still counts for its own space.
  const legacy = st.account.settings.dailyNotebookId as string | undefined;
  if (legacy && inSpace.some((n) => n.id === legacy)) return legacy;
  return inSpace[0]?.id ?? null;
}

/** Choose the daily-notes notebook of its space. */
export function setDailyNotebook(notebookId: string) {
  const spaceId = spaceOfNotebook(useWorkspace.getState(), notebookId);
  if (spaceId) setBySpace("dailyNotebookBySpace", spaceId, notebookId);
}

export function findDaily(date: string): string | null {
  const nb = dailyNotebookId();
  const n = Object.values(useWorkspace.getState().notes).find(
    (x) => x.kind === "daily" && x.dailyDate === date && x.notebookId === nb && !x.trashedAt,
  );
  return n?.id ?? null;
}

export async function getOrCreateDaily(date: string): Promise<string> {
  const existing = findDaily(date);
  if (existing) return existing;
  const nb = dailyNotebookId();
  if (!nb) throw new Error("No notebook for daily notes");
  const title = formatLongDate(date);
  return createNote({ notebookId: nb, kind: "daily", dailyDate: date, title: title.charAt(0).toUpperCase() + title.slice(1) });
}

export function findInbox(): string | null {
  const nb = dailyNotebookId();
  const n = Object.values(useWorkspace.getState().notes).find((x) => x.kind === "inbox" && x.notebookId === nb && !x.trashedAt);
  return n?.id ?? null;
}

export async function getOrCreateInbox(title: string): Promise<string> {
  const existing = findInbox();
  if (existing) return existing;
  const nb = dailyNotebookId();
  if (!nb) throw new Error("No notebook for the inbox");
  return createNote({ notebookId: nb, kind: "inbox", title, body: [] });
}

// ---------- tasks ----------

async function withNote<T>(noteId: string, fn: (doc: Y.Doc) => T): Promise<T> {
  const rt = runtime();
  const doc = await rt.store.acquire(noteId);
  try {
    return fn(doc);
  } finally {
    rt.store.release(noteId);
    // Task screens read the index; refresh it right away instead of after the edit debounce.
    rt.indexer.schedule(noteId, 20);
  }
}

export function patchTask(noteId: string, taskId: string, patch: TaskPatch) {
  return withNote(noteId, (doc) => updateTask(doc, taskId, patch));
}

export function editTaskText(noteId: string, taskId: string, text: string) {
  return withNote(noteId, (doc) => setTaskText(doc, taskId, text));
}

export function deleteTask(noteId: string, taskId: string) {
  return withNote(noteId, (doc) => removeTask(doc, taskId));
}

export function addTask(noteId: string, text: string, attrs: { scheduled?: string | null; deadline?: string | null } = {}) {
  return withNote(noteId, (doc) => appendTask(doc, text, attrs));
}

/** Move a task to another note (keeps its id and dates). */
export async function moveTask(fromNoteId: string, taskId: string, toNoteId: string) {
  if (fromNoteId === toNoteId) return;
  const removed = await withNote(fromNoteId, (doc) => removeTask(doc, taskId));
  if (!removed) return;
  const a = removed.attrs;
  await withNote(toNoteId, (doc) =>
    appendTask(doc, removed.text, {
      taskId,
      state: (a.state as never) ?? "open",
      scheduled: (a.scheduled as string) ?? null,
      deadline: (a.deadline as string) ?? null,
    }),
  );
}

// ---------- bootstrap for a fresh account ----------

export async function bootstrapAccount(labels: { space: string; notebook: string; welcomeTitle: string; welcomeBody: string[] }) {
  const spaceId = createSpace({ name: labels.space, icon: "🏡", color: "tint.orange" });
  const nb = await createNotebook({ spaceId, name: labels.notebook, icon: "📓", color: "tint.blue" });
  await createNote({ notebookId: nb, title: labels.welcomeTitle, body: labels.welcomeBody });
  // The account document is registered by the server at signup (api.md): nothing to send.
}

export function hasNoteKey(noteId: string) {
  return !!cachedNoteKey(noteId);
}

/** Set a note's title (content + index copy). */
export async function setTitleOf(noteId: string, title: string) {
  await withNote(noteId, (doc) => setTitle(doc, title));
  updateNote(noteId, { title });
}
