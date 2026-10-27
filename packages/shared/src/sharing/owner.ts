// What the owner's client does on start (api.md `GET /shared-by-me`, D-54):
// finish or start key rotations, repair NoteMeta of shared notes, re-create
// guest links after a rotation and deliver keys to accepted members.
import type * as Y from "yjs";
import type { Member, ShareTarget, SharedByMeItem } from "../contracts/api.js";
import { getNoteMeta } from "../document/records.js";
import type { SharingApi } from "./api.js";
import { noteKeysFromMeta, ownerNotebookKeys, type VersionedKeys } from "./keys.js";
import { deliverAwaitingKeys, type OwnerIdentity } from "./members.js";
import {
  recreateShareLinks,
  repairSharedNoteMeta,
  rotateNotebookKey,
  rotateSharedNoteKey,
} from "./rotation.js";

export interface OwnerMaintenanceOptions {
  api: SharingApi;
  owner: OwnerIdentity;
  masterKey: Uint8Array;
  /** Live, caught-up index of one of the owner's notebooks. */
  notebookIndex: (notebookId: string) => Promise<Y.Doc>;
  /** The owner's notebook holding a note shared on its own; null if unknown here. */
  notebookOfNote: (noteId: string) => Promise<string | null>;
  isAgentMode: (notebookId: string) => boolean;
  /** `syncClient.whenSent(notebookId)`. */
  whenIndexSent: (notebookId: string) => Promise<void>;
  /** New keys of a notebook or note: update the app's keyring. */
  onKeys: (target: ShareTarget, keys: VersionedKeys) => void | Promise<void>;
  /** Asked before a key goes to an account created after its invitation. */
  confirm?: (target: ShareTarget, member: Member) => boolean | Promise<boolean>;
  /** Re-create guest links after a rotation (crypto.md §10.3); omit to skip. */
  links?: {
    webOrigin: string;
    onRecreated: (target: ShareTarget, urls: string[]) => void;
  };
}

export interface OwnerMaintenanceResult {
  target: ShareTarget;
  rotated: boolean;
  repaired: boolean;
  delivered: string[];
  /** Left for the next run (e.g. the note's notebook is not on this device). */
  skipped?: string;
}

/** One pass over `GET /shared-by-me`. Errors of one resource do not stop the others. */
export async function maintainOwnedShares(
  options: OwnerMaintenanceOptions,
): Promise<(OwnerMaintenanceResult | { target: ShareTarget; error: unknown })[]> {
  const out: (OwnerMaintenanceResult | { target: ShareTarget; error: unknown })[] = [];
  for (const item of await options.api.sharedByMe()) {
    try {
      out.push(
        item.target.kind === "notebook"
          ? await maintainNotebook(options, item)
          : await maintainNote(options, item),
      );
    } catch (error) {
      out.push({ target: item.target, error });
    }
  }
  return out;
}

async function maintainNotebook(
  o: OwnerMaintenanceOptions,
  item: SharedByMeItem,
): Promise<OwnerMaintenanceResult> {
  const { target } = item;
  const result: OwnerMaintenanceResult = { target, rotated: false, repaired: false, delivered: [] };
  let keys = ownerNotebookKeys(await o.api.getNotebookKey(target.id), o.masterKey, target.id);
  if (item.keyRotationPending) {
    const r = await rotateNotebookKey({
      api: o.api,
      notebookId: target.id,
      owner: o.owner,
      masterKey: o.masterKey,
      index: await o.notebookIndex(target.id),
      agentMode: o.isAgentMode(target.id),
      whenIndexSent: () => o.whenIndexSent(target.id),
      onKeys: async (k) => {
        if (k.notebook) await o.onKeys(target, k.notebook);
        for (const [noteId, nk] of k.notes ?? []) await o.onKeys({ kind: "note", id: noteId }, nk);
      },
    });
    keys = r.notebook;
    result.rotated = r.rotated;
    if (r.rotated) await relink(o, target, keys);
  }
  if (item.awaitingKey > 0) result.delivered = await deliver(o, target, keys);
  return result;
}

async function maintainNote(
  o: OwnerMaintenanceOptions,
  item: SharedByMeItem,
): Promise<OwnerMaintenanceResult> {
  const { target } = item;
  const result: OwnerMaintenanceResult = { target, rotated: false, repaired: false, delivered: [] };
  const notebookId = await o.notebookOfNote(target.id);
  if (!notebookId) return { ...result, skipped: "notebook of the note is not available" };
  const index = await o.notebookIndex(notebookId);
  const notebookKeys = ownerNotebookKeys(
    await o.api.getNotebookKey(notebookId),
    o.masterKey,
    notebookId,
  ).keys;
  const meta = getNoteMeta(index, target.id);
  if (!meta) return { ...result, skipped: "note is not in its notebook index" };
  if (item.keyVersion > (meta.keyVersion ?? 1)) {
    result.repaired = await repairSharedNoteMeta({
      api: o.api,
      noteId: target.id,
      index,
      notebookKey: notebookKeys[0]!,
    });
  }
  let keys: VersionedKeys = noteKeysFromMeta(getNoteMeta(index, target.id)!, notebookKeys);
  if (item.keyRotationPending) {
    keys = await rotateSharedNoteKey({
      api: o.api,
      noteId: target.id,
      owner: o.owner,
      index,
      notebookKeys,
      onKeys: (k) => o.onKeys(target, k),
    });
    result.rotated = true;
    await relink(o, target, keys);
  }
  if (result.repaired && !result.rotated) await o.onKeys(target, keys);
  if (item.awaitingKey > 0) result.delivered = await deliver(o, target, keys);
  return result;
}

async function relink(o: OwnerMaintenanceOptions, target: ShareTarget, keys: VersionedKeys) {
  if (!o.links) return;
  const links = await recreateShareLinks({
    api: o.api,
    target,
    key: keys.keys[0]!,
    webOrigin: o.links.webOrigin,
  });
  if (links.length)
    o.links.onRecreated(
      target,
      links.map((l) => l.url),
    );
}

async function deliver(o: OwnerMaintenanceOptions, target: ShareTarget, keys: VersionedKeys) {
  const members = await deliverAwaitingKeys({
    api: o.api,
    target,
    keys,
    owner: o.owner,
    ...(o.confirm ? { confirm: (m: Member) => o.confirm!(target, m) } : {}),
  });
  return members.map((m) => m.userId);
}
