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

/** Prefetch wrapped notebook keys in one request (new device, first sync). */
export async function prefetchNotebookKeys(): Promise<void> {
  try {
    const list = await notebooksApi.list();
    const db = accountDb();
    await db.kv.bulkPut(list.map((n) => ({ key: `nbkey:${n.id}`, value: n.wrappedKey })));
  } catch {
    // offline — cached keys are used
  }
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
