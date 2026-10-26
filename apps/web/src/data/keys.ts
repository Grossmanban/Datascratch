import { notebooksApi } from "@/api/endpoints";
import { getMasterKey } from "@/auth/session";
import { ad, unwrapKey } from "@/lib/shared";
import { accountDb } from "./db";

// Unwrapped keys live only in memory. Wrapped forms (under the master key) are cached
// in IndexedDB so the app opens offline.
const notebookKeys = new Map<string, Uint8Array>();
const noteKeys = new Map<string, Uint8Array>();

export function clearKeys() {
  for (const k of notebookKeys.values()) k.fill(0);
  for (const k of noteKeys.values()) k.fill(0);
  notebookKeys.clear();
  noteKeys.clear();
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
  let wrapped = (await accountDb().kv.get(`nbkey:${notebookId}`))?.value as string | undefined;
  if (!wrapped) {
    try {
      wrapped = (await notebooksApi.key(notebookId)).wrappedKey;
      await accountDb().kv.put({ key: `nbkey:${notebookId}`, value: wrapped });
    } catch {
      return null;
    }
  }
  try {
    const key = await unwrapKey(getMasterKey(), wrapped, ad.notebookKey(notebookId));
    notebookKeys.set(notebookId, key);
    return key;
  } catch (e) {
    console.error("Cannot unwrap notebook key", notebookId, e);
    return null;
  }
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
    try {
      serverKey = await unwrapKey(getMasterKey(), n.wrappedKey, ad.notebookKey(n.id));
    } catch (e) {
      console.error("[ds] cannot unwrap the server's notebook key", n.id, e);
      continue;
    }
    let local = notebookKeys.get(n.id);
    if (!local) {
      const cached = (await db.kv.get(`nbkey:${n.id}`))?.value as string | undefined;
      if (cached && cached !== n.wrappedKey) local = await unwrapKey(getMasterKey(), cached, ad.notebookKey(n.id)).catch(() => undefined);
    }
    if (local && !sameBytes(local, serverKey)) {
      console.warn("[ds] notebook key differed from the server's; switching to the server's", n.id);
      replaced.push({ notebookId: n.id, oldKey: local, newKey: serverKey });
    }
    notebookKeys.set(n.id, serverKey);
    await db.kv.put({ key: `nbkey:${n.id}`, value: n.wrappedKey });
  }
  return replaced;
}

export async function noteKey(noteId: string, notebookId: string, wrappedKey: string | undefined): Promise<Uint8Array | null> {
  const cached = noteKeys.get(noteId);
  if (cached) return cached;
  if (!wrappedKey) return null;
  const nbKey = await notebookKey(notebookId);
  if (!nbKey) return null;
  try {
    const key = await unwrapKey(nbKey, wrappedKey, ad.noteKey(noteId));
    noteKeys.set(noteId, key);
    return key;
  } catch (e) {
    console.error("Cannot unwrap note key", noteId, e);
    return null;
  }
}

export function cachedNoteKey(noteId: string): Uint8Array | undefined {
  return noteKeys.get(noteId);
}
