// «Общие со мной» placement in the account document (document-model.md §2, D-54).
import type * as Y from "yjs";
import type { SharedItem, ShareTarget } from "../contracts/api.js";
import type { SharedRef } from "../contracts/document.js";
import { deleteSharedRef, getSharedRefs, putSharedRef } from "../document/records.js";

/**
 * Align `account.shared` with `GET /shared-with-me`: resources new to this
 * account land in `spaceId` (the current space) at the end; placements of
 * resources no longer shared are removed. Returns the removed targets — the
 * app drops their tabs, stars and local data.
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
  let order = refs.filter((r) => r.spaceId === spaceId).reduce((m, r) => Math.max(m, r.order), 0);
  account.transact(() => {
    for (const item of items) {
      if (known.has(`${item.target.kind}:${item.target.id}`)) continue;
      const ref: SharedRef = {
        kind: item.target.kind,
        id: item.target.id,
        spaceId,
        order: ++order,
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
