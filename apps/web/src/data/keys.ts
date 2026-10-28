import { noteKeysFromMeta, ownerNotebookKeys, type NotebookKeyResponse, type VersionedKeys } from "@datascratch/shared";
import { notebooksApi } from "@/api/endpoints";
import { getMasterKey } from "@/auth/session";
import { ad, sodiumReady, unwrapKey } from "@/lib/shared";
import { accountDb } from "./db";

// Unwrapped keys live only in memory. Wrapped forms (under the master key) are cached
// in IndexedDB so the app opens offline.
const notebookKeys = new Map<string, Uint8Array>();
/** Keys this device used before switching to the server's (items it sealed with them stay readable). */
const retiredNotebookKeys = new Map<string, Uint8Array[]>();

export function retiredKeysFor(notebookId: string): Uint8Array[] {
  return retiredNotebookKeys.get(notebookId) ?? [];
}
const noteKeys = new Map<string, Uint8Array>();
// D-54 key versions (crypto.md §10.3): the current key is above, older ones (newest first) here —
// old updates and history versions are not re-encrypted, they stay readable with these.
const olderKeys = new Map<string, Uint8Array[]>();
/** The note key version each cached note key came from (a newer NoteMeta means it changed). */
const noteKeyVersions = new Map<string, number>();

export function clearKeys() {
  retiredNotebookKeys.clear();
  for (const k of notebookKeys.values()) k.fill(0);
  for (const k of noteKeys.values()) k.fill(0);
  for (const ks of olderKeys.values()) for (const k of ks) k.fill(0);
  notebookKeys.clear();
  noteKeys.clear();
  olderKeys.clear();
  noteKeyVersions.clear();
}

/** Older versions of a doc's key and keys this device used before (SyncClient alternateKeysFor). */
export function alternateKeysFor(docId: string): Uint8Array[] {
  return [...(olderKeys.get(docId) ?? []), ...retiredKeysFor(docId)];
}

/** New keys of a notebook or note (a rotation, a member's delivered key): current + older versions. */
export function setKeyring(docId: string, kind: "notebook" | "note", keys: VersionedKeys) {
  const [current, ...older] = keys.keys;
  if (!current) return;
  (kind === "notebook" ? notebookKeys : noteKeys).set(docId, current);
  olderKeys.set(docId, older);
  if (kind === "note") noteKeyVersions.set(docId, keys.version);
}

/** The notebook key as `GET /notebooks/:id/key` gives it (with its version and chain), cached wrapped. */
async function fetchNotebookKey(notebookId: string): Promise<NotebookKeyResponse> {
  const res = (await notebooksApi.key(notebookId)) as NotebookKeyResponse;
  await accountDb().kv.put({ key: `nbkey:${notebookId}`, value: res });
  return res;
}

/**
 * Opens a notebook key from the cache or the server for `notebookKey()`. A key set meanwhile (by
 * checkNotebookKeys, a rotation or another caller) wins: this one was read before it and may be
 * the very key that was just replaced — writing it back would undo the switch to the server's key.
 */
async function openNotebookKey(notebookId: string, res: NotebookKeyResponse): Promise<Uint8Array> {
  await sodiumReady();
  const keys = ownerNotebookKeys(res, getMasterKey(), notebookId);
  const current = notebookKeys.get(notebookId);
  if (current) return current;
  setKeyring(notebookId, "notebook", keys);
  return keys.keys[0]!;
}

export function rememberNotebookKey(notebookId: string, key: Uint8Array, wrapped: string) {
  notebookKeys.set(notebookId, key);
  void accountDb().kv.put({ key: `nbkey:${notebookId}`, value: wrapped });
}

export function rememberNoteKey(noteId: string, key: Uint8Array) {
  noteKeys.set(noteId, key);
}

export function cachedNotebookKey(notebookId: string): Uint8Array | undefined {
  return notebookKeys.get(notebookId);
}

export async function notebookKey(notebookId: string): Promise<Uint8Array | null> {
  const cached = notebookKeys.get(notebookId);
  if (cached) return cached;
  // Cached as the plain wrapped key (version 1, before D-54) or the whole key response.
  const stored = (await accountDb().kv.get(`nbkey:${notebookId}`))?.value as string | NotebookKeyResponse | undefined;
  let res: NotebookKeyResponse | null = typeof stored === "string" ? { wrappedKey: stored } : (stored ?? null);
  if (!res) {
    try {
      res = await fetchNotebookKey(notebookId);
    } catch {
      return null;
    }
  }
  try {
    return await openNotebookKey(notebookId, res);
  } catch {
    // A cached key from before a rotation (its version's ad no longer matches): ask the server.
    try {
      return await openNotebookKey(notebookId, await fetchNotebookKey(notebookId));
    } catch (e) {
      console.error("Cannot unwrap notebook key", notebookId, e);
      return null;
    }
  }
}

/** After a rotation by this device: the server holds the new wrapped key; refresh the cached copy. */
export async function refreshNotebookKeyCache(notebookId: string) {
  await fetchNotebookKey(notebookId).catch(() => undefined);
}

/** The notebook key as the server holds it (canonical), refreshing the cache; null if unreachable. */
export async function serverNotebookKey(notebookId: string): Promise<Uint8Array | null> {
  const { wrappedKey } = await notebooksApi.key(notebookId);
  const [replaced] = await checkNotebookKeys([{ id: notebookId, wrappedKey }]);
  if (replaced) for (const fn of replacedListeners) fn(replaced);
  return notebookKeys.get(notebookId) ?? null;
}

const replacedListeners = new Set<(r: ReplacedNotebookKey) => void>();
/** The runtime re-reads and re-uploads a notebook whose key was replaced outside its own check. */
export function onNotebookKeyReplaced(fn: (r: ReplacedNotebookKey) => void) {
  replacedListeners.add(fn);
  return () => replacedListeners.delete(fn);
}

/** A notebook whose key here differed from the server's (which is now used). */
export type ReplacedNotebookKey = { notebookId: string; oldKey: Uint8Array; newKey: Uint8Array };

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * The server's wrapped notebook key (GET /v1/notebooks) is the only canonical one: the server never
 * replaces it, and another device that registered the notebook first may hold a different key than
 * this one generated (e.g. our POST /notebooks waited offline and then got 409). Every cached key
 * is checked against it — after unwrapping: two wrappings of one key differ — and a differing one
 * is replaced. The caller re-reads and re-uploads what was sealed with the old key.
 */
export async function checkNotebookKeys(list: { id: string; wrappedKey: string }[]): Promise<ReplacedNotebookKey[]> {
  const db = accountDb();
  const replaced: ReplacedNotebookKey[] = [];
  for (const n of list) {
    let serverKey: Uint8Array;
    let serverRes: NotebookKeyResponse = { wrappedKey: n.wrappedKey };
    try {
      serverKey = await unwrapKey(getMasterKey(), n.wrappedKey, ad.notebookKey(n.id));
    } catch {
      // A rotated key (version ≥ 2, D-54) has a versioned ad: its version comes with GET /key.
      try {
        serverRes = (await notebooksApi.key(n.id)) as NotebookKeyResponse;
        await sodiumReady();
        const keys = ownerNotebookKeys(serverRes, getMasterKey(), n.id);
        serverKey = keys.keys[0]!;
        olderKeys.set(n.id, keys.keys.slice(1));
      } catch (e) {
        console.error("[ds] cannot unwrap the server's notebook key", n.id, e);
        continue;
      }
    }
    let local = notebookKeys.get(n.id);
    if (!local) {
      const cached = (await db.kv.get(`nbkey:${n.id}`))?.value as string | NotebookKeyResponse | undefined;
      const res: NotebookKeyResponse | undefined = typeof cached === "string" ? { wrappedKey: cached } : cached;
      if (res && res.wrappedKey !== serverRes.wrappedKey)
        local = await sodiumReady()
          .then(() => ownerNotebookKeys(res, getMasterKey(), n.id).keys[0])
          .catch(() => undefined);
    }
    if (local && !sameBytes(local, serverKey)) {
      console.warn("[ds] notebook key differed from the server's; switching to the server's", n.id);
      replaced.push({ notebookId: n.id, oldKey: local, newKey: serverKey });
      retiredNotebookKeys.set(n.id, [...retiredKeysFor(n.id), local]);
    }
    // A rotation (D-54) is not a mismatch: the older version is in the chain.
    if (replaced.at(-1)?.notebookId === n.id && olderKeys.get(n.id)?.some((k) => sameBytes(k, local!))) {
      replaced.pop();
      retiredNotebookKeys.set(n.id, retiredKeysFor(n.id).filter((k) => k !== local));
    }
    notebookKeys.set(n.id, serverKey);
    await db.kv.put({ key: `nbkey:${n.id}`, value: serverRes });
  }
  return replaced;
}

/** The NoteMeta fields that carry a note's key (document-model §3, crypto.md §10.3). */
export type NoteKeyMeta = { wrappedKey?: string; keyVersion?: number; keyChain?: string[] };

export async function noteKey(noteId: string, notebookId: string, meta: NoteKeyMeta): Promise<Uint8Array | null> {
  const cached = noteKeys.get(noteId);
  // A newer key version in the NoteMeta (a rotation, D-54) replaces the cached key.
  if (cached && (meta.keyVersion ?? 1) === (noteKeyVersions.get(noteId) ?? 1)) return cached;
  if (!meta.wrappedKey) return cached ?? null;
  const nbKey = await notebookKey(notebookId);
  if (!nbKey) return null;
  try {
    await sodiumReady();
    // The NoteMeta may still be wrapped under an older notebook key mid-rotation.
    const keys = noteKeysFromMeta({ id: noteId, wrappedKey: meta.wrappedKey, keyVersion: meta.keyVersion, keyChain: meta.keyChain }, [nbKey, ...(olderKeys.get(notebookId) ?? [])]);
    setKeyring(noteId, "note", keys);
    return keys.keys[0]!;
  } catch (e) {
    console.error("Cannot unwrap note key", noteId, e);
    return null;
  }
}

export function cachedNoteKey(noteId: string): Uint8Array | undefined {
  return noteKeys.get(noteId);
}
