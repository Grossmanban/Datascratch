// Key rotation after a member left or was removed (crypto.md §10.3, D-54):
// 1. `rotate` — new notebook key for owner, members and agents in one request;
// 2. every note gets a new noteKey, written to the index with a normal push;
// 3. `rotate/done` once the index is accepted. Safe to resume after a crash.
import type * as Y from "yjs";
import { AD } from "../contracts/crypto.js";
import type { NoteMeta } from "../contracts/document.js";
import { toBase64Url } from "../crypto/base64url.js";
import { generateKey, unwrapKey, wrapKey } from "../crypto/keys.js";
import { wrapPreviousKey } from "../crypto/sharing.js";
import { getNoteMetas, patchNoteMeta } from "../document/records.js";
import type { SharingApi } from "./api.js";
import { noteKeysFromMeta, ownerNotebookKeys, type VersionedKeys } from "./keys.js";
import { wrapForMembers, type OwnerIdentity } from "./members.js";

export interface RotateNotebookOptions {
  api: Pick<
    SharingApi,
    "getNotebookKey" | "listMembers" | "getPublicKey" | "rotateKey" | "rotateKeyDone"
  >;
  notebookId: string;
  owner: OwnerIdentity;
  masterKey: Uint8Array;
  /** The notebook's index document, live and caught up in the SyncClient. */
  index: Y.Doc;
  /** The notebook is in agent mode: the server gets the new key (crypto.md §8). */
  agentMode: boolean;
  /**
   * New keys to use from now on. Called with the notebook keys right after
   * step 1 (before the index is written: its updates must use the new key)
   * and with the note keys after the index is accepted (step 3).
   */
  onKeys: (keys: {
    notebook?: VersionedKeys;
    notes?: Map<string, VersionedKeys>;
  }) => void | Promise<void>;
  /** Resolves when the index edits are accepted (`syncClient.whenSent(notebookId)`). */
  whenIndexSent: () => Promise<void>;
  /** Run step 1 even without `keyRotationPending` (e.g. a manual «сменить ключ»). */
  force?: boolean;
}

export interface RotateResult {
  /** false: nothing was pending. */
  rotated: boolean;
  /** Whether step 1 ran now (false when resuming after it). */
  newVersion: boolean;
  notebook: VersionedKeys;
  rekeyedNotes: number;
}

/**
 * Run (or resume) the rotation of a notebook key. Step 1 is skipped when some
 * note is still under an older notebook key — then step 1 already happened and
 * only the notes are left. When every note is under the current key the step
 * cannot be told apart from «not started», so it runs again: an extra version
 * is harmless.
 */
export async function rotateNotebookKey(options: RotateNotebookOptions): Promise<RotateResult> {
  const { api, notebookId, owner, masterKey, index } = options;
  const target = { kind: "notebook" as const, id: notebookId };
  const res = await api.getNotebookKey(notebookId);
  let notebook = ownerNotebookKeys(res, masterKey, notebookId);
  if (!res.keyRotationPending && !options.force) {
    return { rotated: false, newVersion: false, notebook, rekeyedNotes: 0 };
  }
  const metas = getNoteMetas(index, { includeTrashed: true });
  const behind = (m: NoteMeta) => noteKeysFromMeta(m, notebook.keys).notebookIndex > 0;
  const resuming = metas.some(behind);

  if (!resuming) {
    const version = notebook.version + 1;
    const key = generateKey();
    const members = (await api.listMembers(target)).filter((m) => m.userId !== owner.userId);
    await api.rotateKey(target, {
      version,
      ownerWrappedKey: wrapKey(masterKey, key, AD.notebookKeyVersion(notebookId, version)),
      previousKeyWrap: wrapPreviousKey(key, notebook.keys[0]!, "notebook", notebookId, version),
      memberKeys: await wrapForMembers(
        api,
        target,
        key,
        version,
        owner,
        members.map((m) => m.userId),
      ),
      ...(options.agentMode ? { notebookKey: toBase64Url(key) } : {}),
    });
    notebook = { version, keys: [key, ...notebook.keys] };
    await options.onKeys({ notebook });
  }

  // Step 2: every note still under an older notebook key gets a new noteKey.
  const notes = new Map<string, VersionedKeys>();
  index.transact(() => {
    for (const meta of metas) {
      const old = noteKeysFromMeta(meta, notebook.keys);
      // Under the current notebook key: re-keyed already, or created after step 1.
      if (old.notebookIndex === 0) continue;
      const version = old.version + 1;
      const key = generateKey();
      patchNoteMeta(index, meta.id, {
        wrappedKey: wrapKey(notebook.keys[0]!, key, AD.noteKeyVersion(meta.id, version)),
        keyVersion: version,
        keyChain: [
          wrapPreviousKey(key, old.keys[0]!, "note", meta.id, version),
          ...(meta.keyChain ?? []),
        ],
      });
      notes.set(meta.id, { version, keys: [key, ...old.keys] });
    }
  });
  await options.whenIndexSent();
  if (notes.size) await options.onKeys({ notes });
  await api.rotateKeyDone(target);
  return { rotated: true, newVersion: !resuming, notebook, rekeyedNotes: notes.size };
}

export interface RotateNoteOptions {
  api: Pick<SharingApi, "listMembers" | "getPublicKey" | "rotateKey">;
  noteId: string;
  owner: OwnerIdentity;
  /** The owner's notebook index that holds the note's NoteMeta, and its keys (newest first). */
  index: Y.Doc;
  notebookKeys: Uint8Array[];
  onKeys: (keys: VersionedKeys) => void | Promise<void>;
}

/** Rotate the key of a note shared on its own; `rotate` clears the pending flag itself. */
export async function rotateSharedNoteKey(options: RotateNoteOptions): Promise<VersionedKeys> {
  const { api, noteId, owner, index } = options;
  const target = { kind: "note" as const, id: noteId };
  const meta = getNoteMetas(index, { includeTrashed: true }).find((m) => m.id === noteId);
  if (!meta) throw new Error(`note ${noteId} is not in this index`);
  const old = noteKeysFromMeta(meta, options.notebookKeys);
  const version = old.version + 1;
  const key = generateKey();
  const ownerWrappedKey = wrapKey(
    options.notebookKeys[0]!,
    key,
    AD.noteKeyVersion(noteId, version),
  );
  const previousKeyWrap = wrapPreviousKey(key, old.keys[0]!, "note", noteId, version);
  const members = (await api.listMembers(target)).filter((m) => m.userId !== owner.userId);
  await api.rotateKey(target, {
    version,
    ownerWrappedKey,
    previousKeyWrap,
    memberKeys: await wrapForMembers(
      api,
      target,
      key,
      version,
      owner,
      members.map((m) => m.userId),
    ),
  });
  patchNoteMeta(index, noteId, {
    wrappedKey: ownerWrappedKey,
    keyVersion: version,
    keyChain: [previousKeyWrap, ...(meta.keyChain ?? [])],
  });
  const keys = { version, keys: [key, ...old.keys] };
  await options.onKeys(keys);
  return keys;
}

/**
 * After a crash between `rotate` and the index push: copy the server's current
 * key of a shared note into its NoteMeta. Returns true when the NoteMeta changed.
 */
export async function repairSharedNoteMeta(options: {
  api: Pick<SharingApi, "getSharedNoteKey">;
  noteId: string;
  index: Y.Doc;
  notebookKey: Uint8Array;
}): Promise<boolean> {
  const { noteId, index } = options;
  const meta = getNoteMetas(index, { includeTrashed: true }).find((m) => m.id === noteId);
  if (!meta) return false;
  const res = await options.api.getSharedNoteKey(noteId);
  if (res.version <= (meta.keyVersion ?? 1)) return false;
  // Check before writing: the wrap must open with this notebook key.
  unwrapKey(options.notebookKey, res.ownerWrappedKey, AD.noteKeyVersion(noteId, res.version));
  patchNoteMeta(index, noteId, {
    wrappedKey: res.ownerWrappedKey,
    keyVersion: res.version,
    keyChain: res.keyChain,
  });
  return true;
}
