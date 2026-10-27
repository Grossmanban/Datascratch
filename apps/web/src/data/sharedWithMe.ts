// D-54, the member's side: what other accounts share with this one (`GET /shared-with-me`), its keys
// (wrapped for this account's key pair, crypto.md §10.2), its place in «Общие со мной» and the role.
import { reconcileSharedRefs, sharedItemKeys, type SharedItem, type ShareTarget } from "@datascratch/shared";
import { create } from "zustand";
import { useAuth } from "@/auth/session";
import { forgetSharedResource } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import i18n from "@/i18n";
import { toast } from "@/ui";
import { kvGet, kvSet } from "./db";
import { setKeyring } from "./keys";
import { runtime } from "./runtime";
import { accountBoxKeys, sharingApi } from "./sharing";

export type SharedState = {
  /** By "<kind>:<id>"; `keyed` once the owner's client delivered the key. */
  items: Record<string, { target: ShareTarget; role: SharedItem["role"]; ownerUserId: string; ownerEmail: string; docIds: string[]; keyed: boolean }>;
};

export const useShared = create<SharedState>(() => ({ items: {} }));

const keyOf = (t: ShareTarget) => `${t.kind}:${t.id}`;

/** The shared resource a document belongs to (its notebook's or its own), if any. */
export function sharedResourceOf(docId: string) {
  const { items } = useShared.getState();
  const nb = useWorkspace.getState().notes[docId]?.notebookId;
  return items[`note:${docId}`] ?? items[`notebook:${docId}`] ?? (nb ? items[`notebook:${nb}`] : undefined) ?? null;
}

/** Documents of a «Только чтение» resource: SyncClient does not send their edits (D-54). */
export const isReadOnlyDoc = (docId: string) => sharedResourceOf(docId)?.role === "viewer";

let running: Promise<void> | null = null;
let soon: ReturnType<typeof setTimeout> | undefined;
/** Targets this account is leaving itself: no «access closed» notice for them. */
const leaving = new Set<string>();

/** «Выйти»: the member removes itself (`DELETE …/members/<own userId>`), then the list is re-read. */
export async function leaveShared(target: ShareTarget) {
  const { userId } = useAuth.getState();
  if (!userId) return;
  leaving.add(keyOf(target));
  try {
    await sharingApi.removeMember(target, userId);
    await refreshShared();
  } finally {
    leaving.delete(keyOf(target));
  }
}

/** Re-read what is shared with this account; keys, placements and attachments follow. */
export function refreshShared(): Promise<void> {
  running ??= pass()
    .catch((e) => console.warn("[ds] shared with me:", (e as Error).message))
    .finally(() => {
      running = null;
    });
  return running;
}

async function pass() {
  const { userId } = useAuth.getState();
  if (!userId) return;
  let list: SharedItem[];
  try {
    list = await sharingApi.sharedWithMe();
    await kvSet("sharedWithMe", list);
  } catch (e) {
    // Offline: the last list keeps shared notebooks readable (keys are wrapped for this account).
    list = (await kvGet<SharedItem[]>("sharedWithMe")) ?? [];
    if (!list.length) throw e;
    await apply(list, userId, false);
    return;
  }
  await apply(list, userId, true);
}

async function apply(list: SharedItem[], userId: string, fromServer: boolean) {
  const pair = await accountBoxKeys();
  const items: SharedState["items"] = {};
  for (const item of list) {
    let keyed = false;
    try {
      const keys = sharedItemKeys(item, { userId, secretKey: pair.secretKey });
      if (keys) {
        setKeyring(item.target.id, item.target.kind, keys);
        keyed = true;
      }
    } catch (e) {
      console.warn("[ds] cannot open the key of a shared resource", item.target, (e as Error).message);
    }
    items[keyOf(item.target)] = { target: item.target, role: item.role, ownerUserId: item.owner.userId, ownerEmail: item.owner.email, docIds: item.docIds, keyed };
  }
  useShared.setState({ items });
  // Accepted but not keyed yet: the owner's client delivers the key once it is online — look again soon.
  clearTimeout(soon);
  if (Object.values(items).some((i) => !i.keyed)) soon = setTimeout(() => void refreshShared(), 15_000);
  const rt = runtime();
  // Placement in «Общие со мной»: new ones go to the current space; gone ones are cleaned up.
  if (fromServer) {
    const spaceId = useWorkspace.getState().activeSpaceId;
    if (spaceId) {
      const { removed } = reconcileSharedRefs(rt.account, list, spaceId);
      for (const target of removed) {
        if (!leaving.has(keyOf(target))) toast(i18n.t("shared.gone"));
        forgetSharedResource(target);
        await rt.dropShared(target);
      }
    }
  }
  await rt.syncSharedDocs();
}
