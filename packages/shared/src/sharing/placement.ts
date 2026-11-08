// «Общие со мной» placement in the account document (document-model.md §2, D-54).
import type * as Y from "yjs";
import type { AccountSharedItem, SharedItem, ShareTarget } from "../contracts/api.js";
import type { SharedRef } from "../contracts/document.js";
import {
  deleteSharedRef,
  deleteSharedSpaceRef,
  getSharedRefs,
  getSharedSpaceRefs,
  putSharedRef,
  putSharedSpaceRef,
} from "../document/records.js";
import { isAcceptableSharedSpace } from "./trust.js";

/**
 * Align `account.shared` («Поделились со мной», D-63) with `GET /shared-with-me`: resources
 * new to this account go to the top (`order` = smallest − 1; `spaceId` = the current space,
 * legacy only); entries of resources no longer shared are removed. Returns the removed targets
 * — the app drops their tabs, stars and local data.
 */
export function reconcileSharedRefs(
  account: Y.Doc,
  items: SharedItem[],
  spaceId: string,
  now: () => Date = () => new Date(),
): { added: SharedRef[]; removed: ShareTarget[] } {
  const refs = getSharedRefs(account);
  const known = new Set(refs.map((r) => `${r.kind}:${r.id}`));
  const live = new Set(items.map((i) => `${i.target.kind}:${i.target.id}`));
  const added: SharedRef[] = [];
  const removed: ShareTarget[] = [];
  // One section outside spaces (D-63): the newest on top, whatever space it arrived in.
  let order = refs.reduce((m, r) => Math.min(m, r.order), refs.length ? Infinity : 0);
  account.transact(() => {
    for (const item of items) {
      if (known.has(`${item.target.kind}:${item.target.id}`)) continue;
      const ref: SharedRef = {
        kind: item.target.kind,
        id: item.target.id,
        spaceId,
        order: --order,
        addedAt: now().toISOString(),
      };
      putSharedRef(account, ref);
      added.push(ref);
    }
    for (const ref of refs) {
      if (live.has(`${ref.kind}:${ref.id}`)) continue;
      deleteSharedRef(account, ref.kind, ref.id);
      removed.push({ kind: ref.kind, id: ref.id });
    }
  });
  return { added, removed };
}

/**
 * Align `account.sharedSpaces` with `GET /shared-with-me` (document-model.md §2.1, D-62): shared
 * spaces of others new to this account go to the end of the switcher; spaces no longer shared
 * are removed. Returns the removed spaceIds — the app drops their tabs, stars and local data.
 */
export function reconcileSharedSpaces(
  account: Y.Doc,
  items: AccountSharedItem[],
  myUserId: string,
  now: () => Date = () => new Date(),
): { added: string[]; removed: string[] } {
  const refs = getSharedSpaceRefs(account);
  const known = new Set(refs.map((r) => r.spaceId));
  // Never one's own space or a space of this account under another owner's name.
  const live = new Set(
    items.filter((i) => isAcceptableSharedSpace(account, i, myUserId)).map((i) => i.target.id),
  );
  const added: string[] = [];
  const removed: string[] = [];
  let order = refs.reduce((m, r) => Math.max(m, r.order), 0);
  account.transact(() => {
    for (const spaceId of live) {
      if (known.has(spaceId)) continue;
      putSharedSpaceRef(account, spaceId, { order: ++order, addedAt: now().toISOString() });
      added.push(spaceId);
    }
    for (const ref of refs) {
      if (live.has(ref.spaceId)) continue;
      deleteSharedSpaceRef(account, ref.spaceId);
      removed.push(ref.spaceId);
    }
  });
  return { added, removed };
}
