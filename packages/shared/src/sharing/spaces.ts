// Shared spaces on the owner's side (crypto.md §11, D-62): rotating the spaceKey after a member
// left (§11.4) and moving a notebook into or out of a shared space (§11.3).
import type * as Y from "yjs";
import type { AccountTarget, Member } from "../contracts/api.js";
import { AD } from "../contracts/crypto.js";
import type { NotebookRef as AccountNotebookRef } from "../contracts/document.js";
import { toBase64Url } from "../crypto/base64url.js";
import { generateKey, wrapKey } from "../crypto/keys.js";
import { wrapPreviousKey } from "../crypto/sharing.js";
import { wrapNotebookKeyForSpace, wrapSpaceKey } from "../crypto/spaces.js";
import {
  deleteNotebookRef,
  deleteSpaceNotebookRef,
  getNotebookRef,
  getSpaceNotebookRef,
  putNotebookRef,
  putSpaceNotebookRef,
} from "../document/records.js";
import type { SharingApi } from "./api.js";
import {
  ownerNotebookKeys,
  ownerSpaceKeys,
  spaceNotebookKeys,
  type VersionedKeys,
} from "./keys.js";
import {
  wrapForMembers,
  type ConfirmReason,
  type MemberVetting,
  type OwnerIdentity,
} from "./members.js";
import { activeMembers, rekeyNotes } from "./rotation.js";

export interface RotateSpaceOptions {
  api: Pick<
    SharingApi,
    | "getSpaceKey"
    | "listSpaceNotebooks"
    | "listMembers"
    | "getPublicKey"
    | "rotateSpace"
    | "rotateSpaceDone"
  >;
  spaceId: string;
  owner: OwnerIdentity;
  masterKey: Uint8Array;
  /** Live, caught-up index of a notebook of the space. */
  notebookIndex: (notebookId: string) => Promise<Y.Doc>;
  /** `syncClient.whenSent(notebookId)`. */
  whenIndexSent: (notebookId: string) => Promise<void>;
  /**
   * New keys to use from now on: the space and notebook keys right after step 1 (before any
   * index or the space document is written with them), the note keys after each index is
   * accepted.
   */
  onKeys: (keys: {
    space?: VersionedKeys;
    notebooks?: Map<string, VersionedKeys>;
    notes?: Map<string, VersionedKeys>;
  }) => void | Promise<void>;
  /** Run step 1 without `keyRotationPending` (a manual «сменить ключ»). */
  force?: boolean;
  vetting?: MemberVetting;
  confirm?: (member: Member, reason: ConfirmReason) => boolean | Promise<boolean>;
}

export interface RotateSpaceResult {
  rotated: boolean;
  /** Step 1 ran now (false when resuming after it). */
  newVersion: boolean;
  space: VersionedKeys;
  notebooks: Map<string, VersionedKeys>;
  rekeyedNotes: number;
}

/**
 * Run (or resume, from any owner device) the rotation of a spaceKey (crypto.md §11.4):
 * 1. new spaceKey for the owner and every `active` member, and a new key for every notebook of
 *    the space under it — one `POST /spaces/:id/rotate`;
 * 2. every note of every notebook gets a new noteKey (pushed in its index);
 * 3. `POST /spaces/:id/rotate/done`.
 * Step 1 is skipped when the space's key version is above `pendingSinceVersion`.
 */
export async function rotateSpaceKey(options: RotateSpaceOptions): Promise<RotateSpaceResult> {
  const { api, spaceId, owner, masterKey } = options;
  const target: AccountTarget = { kind: "space", id: spaceId };
  const res = await api.getSpaceKey(spaceId);
  let space = ownerSpaceKeys(res, masterKey, spaceId);
  const entries = await api.listSpaceNotebooks(spaceId);
  let notebooks = new Map(
    entries.map((e) => [e.notebookId, spaceNotebookKeys(e, space.keys, spaceId)]),
  );
  if (!res.keyRotationPending && !options.force) {
    return { rotated: false, newVersion: false, space, notebooks, rekeyedNotes: 0 };
  }
  const since = res.pendingSinceVersion;
  const resuming = res.keyRotationPending && since != null && space.version > since;

  if (!resuming) {
    const version = space.version + 1;
    const key = generateKey();
    const members = await activeMembers(api, target, owner.userId);
    const next = new Map<string, VersionedKeys>();
    const notebookBodies = entries.map((e) => {
      const old = notebooks.get(e.notebookId)!;
      const v = old.version + 1;
      const nbKey = generateKey();
      next.set(e.notebookId, { version: v, keys: [nbKey, ...old.keys] });
      return {
        notebookId: e.notebookId,
        version: v,
        spaceWrappedKey: wrapNotebookKeyForSpace(key, nbKey, spaceId, e.notebookId, v),
        previousKeyWrap: wrapPreviousKey(nbKey, old.keys[0]!, "notebook", e.notebookId, v),
        ...(e.mode === "agent" ? { notebookKey: toBase64Url(nbKey) } : {}),
      };
    });
    await api.rotateSpace(spaceId, {
      version,
      ownerWrappedKey: wrapSpaceKey(masterKey, key, spaceId, version),
      previousKeyWrap: wrapPreviousKey(key, space.keys[0]!, "space", spaceId, version),
      memberKeys: await wrapForMembers(
        api,
        target,
        key,
        version,
        owner,
        members,
        options.vetting
          ? { vetting: options.vetting, ...(options.confirm ? { confirm: options.confirm } : {}) }
          : undefined,
      ),
      notebooks: notebookBodies,
    });
    space = { version, keys: [key, ...space.keys] };
    notebooks = next;
    await options.onKeys({ space, notebooks });
  }

  let rekeyed = 0;
  for (const [notebookId, keys] of notebooks) {
    const notes = rekeyNotes(await options.notebookIndex(notebookId), keys);
    await options.whenIndexSent(notebookId);
    if (notes.size) await options.onKeys({ notes });
    rekeyed += notes.size;
  }
  await api.rotateSpaceDone(spaceId);
  return { rotated: true, newVersion: !resuming, space, notebooks, rekeyedNotes: rekeyed };
}

/**
 * Move one of the owner's personal notebooks into a shared space (crypto.md §11.3): its current
 * key is wrapped by the spaceKey (members then see its whole history — warn first), and its
 * NotebookRef moves from the account document to the space document.
 */
export async function moveNotebookIntoSpace(options: {
  api: Pick<SharingApi, "getNotebookKey" | "getSpaceKey" | "putSpaceNotebook">;
  spaceId: string;
  notebookId: string;
  masterKey: Uint8Array;
  account: Y.Doc;
  spaceDoc: Y.Doc;
}): Promise<VersionedKeys> {
  const { api, spaceId, notebookId, masterKey } = options;
  const notebook = ownerNotebookKeys(await api.getNotebookKey(notebookId), masterKey, notebookId);
  const space = ownerSpaceKeys(await api.getSpaceKey(spaceId), masterKey, spaceId);
  await api.putSpaceNotebook(spaceId, notebookId, {
    version: notebook.version,
    spaceWrappedKey: wrapNotebookKeyForSpace(
      space.keys[0]!,
      notebook.keys[0]!,
      spaceId,
      notebookId,
      notebook.version,
    ),
  });
  const ref = getNotebookRef(options.account, notebookId);
  if (ref) {
    const { spaceId: _from, ...rest } = ref;
    putSpaceNotebookRef(options.spaceDoc, rest);
    deleteNotebookRef(options.account, notebookId);
  }
  return notebook;
}

/**
 * Move a notebook of a shared space out into one of the owner's personal spaces (crypto.md
 * §11.3): a new notebook key under the owner's masterKey (`move-out`, step 1), the NotebookRef
 * back into the account document; then call `rotateNotebookKey` for steps 2–3 (it resumes, the
 * server has set `keyRotationPending`). Returns the notebook's new keys.
 */
export async function moveNotebookOutOfSpace(options: {
  api: Pick<SharingApi, "getSpaceKey" | "listSpaceNotebooks" | "moveOutSpaceNotebook">;
  spaceId: string;
  notebookId: string;
  masterKey: Uint8Array;
  account: Y.Doc;
  spaceDoc: Y.Doc;
  /** The owner's personal space the notebook goes to. */
  toSpaceId: string;
  onKeys: (keys: VersionedKeys) => void | Promise<void>;
}): Promise<VersionedKeys> {
  const { api, spaceId, notebookId, masterKey } = options;
  const space = ownerSpaceKeys(await api.getSpaceKey(spaceId), masterKey, spaceId);
  const entry = (await api.listSpaceNotebooks(spaceId)).find((e) => e.notebookId === notebookId);
  if (!entry) throw new Error(`notebook ${notebookId} is not in space ${spaceId}`);
  const old = spaceNotebookKeys(entry, space.keys, spaceId);
  const version = old.version + 1;
  const key = generateKey();
  await api.moveOutSpaceNotebook(spaceId, notebookId, {
    version,
    ownerWrappedKey: wrapKey(masterKey, key, AD.notebookKeyVersion(notebookId, version)),
    previousKeyWrap: wrapPreviousKey(key, old.keys[0]!, "notebook", notebookId, version),
    ...(entry.mode === "agent" ? { notebookKey: toBase64Url(key) } : {}),
  });
  const keys = { version, keys: [key, ...old.keys] };
  await options.onKeys(keys);
  const ref = getSpaceNotebookRef(options.spaceDoc, notebookId);
  if (ref) {
    const moved: AccountNotebookRef = { ...ref, spaceId: options.toSpaceId };
    putNotebookRef(options.account, moved);
    deleteSpaceNotebookRef(options.spaceDoc, notebookId);
  }
  return keys;
}
