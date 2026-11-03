// Shared spaces (D-62, spec/08 «Общие пространства», crypto.md §11, api.md «Общие пространства»).
// One pass after every «Общие со мной» read: which shared spaces this account owns or belongs to,
// their keys (the owner's from GET /spaces/:id/key, a member's from its SharedItem), the keys of
// their notebooks (GET /spaces/:id/notebooks), and the owner's upkeep — keys for members who
// accepted and the key change after someone left (core's maintainOwnedSpaces). Plus the owner's
// commands: make a space shared, move a notebook in and out, a notebook created in a shared space.
import {
  accountVetting,
  createSpaceDoc,
  generateKey,
  maintainOwnedSpaces,
  moveNotebookIntoSpace,
  moveNotebookOutOfSpace,
  ownerSpaceKeys,
  reconcileSharedSpaces,
  rotateNotebookKey,
  sharedItemKeys,
  spaceNotebookKeys,
  wrapNotebookKeyForSpace,
  wrapSpaceKey,
  type AccountSharedItem,
  type Member,
  type SharedSpace,
  type SpaceKeyResponse,
  type SpaceNotebook,
  type VersionedKeys,
} from "@datascratch/shared";
import { getMasterKey, useAuth } from "@/auth/session";
import { accountMaps } from "@/domain/account";
import { setSpaceAccess, useWorkspace, type SpaceAccess } from "@/domain/workspace";
import { useUi } from "@/hooks/useUi";
import i18n from "@/i18n";
import { toast } from "@/ui";
import { kvGet, kvSet } from "./db";
import { forgetSpaceKeys, refreshNotebookKeyCache, setKeyring, setSpaceKeys, spaceKeysOf } from "./keys";
import { confirmMember } from "./ownerShares";
import { runtime } from "./runtime";
import { accountBoxKeys, sharingApi } from "./sharing";

let memberItems: AccountSharedItem[] = [];
let running: Promise<void> | null = null;
let again = false;
let soon: ReturnType<typeof setTimeout> | undefined;
/** Spaces this account is leaving itself: no «access closed» notice for them. */
const leaving = new Set<string>();

/** The member side of «Общие со мной» for whole spaces (`kind = space`), then one pass over all. */
export async function applySpaceItems(items: AccountSharedItem[], fromServer: boolean) {
  const me = useAuth.getState().userId;
  if (!me) return;
  memberItems = items.filter((i) => i.target.kind === "space" && i.owner.userId !== me);
  if (fromServer) placeMemberSpaces(items, me);
  await refreshSpaces();
  // Accepted but not keyed yet: the owner's client delivers the key once it is online — look again soon.
  clearTimeout(soon);
  if (memberItems.some((i) => !i.wrappedKey)) soon = setTimeout(() => void import("./sharedWithMe").then((m) => m.refreshShared()), 15_000);
}

/** Run one pass now (or right after the one in progress). */
export function refreshSpaces(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = pass()
    .catch((e) => console.warn("[ds] shared spaces:", (e as Error).message))
    .finally(() => {
      running = null;
      if (again) {
        again = false;
        void refreshSpaces();
      }
    });
  return running;
}

async function pass() {
  const me = useAuth.getState().userId;
  if (!me) return;
  const pair = await accountBoxKeys();
  const owner = { userId: me, secretKey: pair.secretKey };
  const rt = runtime();
  // The owner's upkeep first (it may change keys); the trust record lives in the account doc.
  if (useWorkspace.getState().accountSynced)
    await maintainOwnedSpaces({
      api: sharingApi,
      owner,
      masterKey: getMasterKey(),
      confirm: (target, member: Member, reason) => confirmMember(target, member, reason),
      vetting: accountVetting(() => rt.account),
      rotation: {
        notebookIndex: (id) => rt.store.load(id),
        whenIndexSent: (id) => rt.client.whenSent(id),
        onKeys: ({ space, notebooks, notes }) => {
          for (const [id, k] of notebooks ?? []) setKeyring(id, "notebook", k);
          for (const [id, k] of notes ?? []) setKeyring(id, "note", k);
          void space;
        },
      },
    })
      .then((results) => {
        for (const r of results) if ("error" in r) console.warn("[ds] shared space upkeep failed:", r.target, r.error);
      })
      .catch((e) => console.warn("[ds] shared space upkeep:", (e as Error).message));

  const list = await cached("spaces", () => sharingApi.listSpaces()).catch(() => [] as SharedSpace[]);
  const access: Record<string, SpaceAccess> = {};
  for (const space of list) {
    const owned = space.ownerUserId === me;
    const item = memberItems.find((i) => i.target.id === space.id);
    if (!owned && !item) continue;
    let keys: VersionedKeys | null = null;
    try {
      keys = owned
        ? ownerSpaceKeys(await cached<SpaceKeyResponse>(`spacekey:${space.id}`, () => sharingApi.getSpaceKey(space.id)), getMasterKey(), space.id)
        : sharedItemKeys(item!, owner);
    } catch (e) {
      console.warn("[ds] cannot open the key of a shared space", space.id, (e as Error).message);
    }
    if (keys) setSpaceKeys(space.id, keys);
    let notebookIds: string[] | null = null;
    if (keys) {
      try {
        const nbs = await cached<SpaceNotebook[]>(`spacenbs:${space.id}`, () => sharingApi.listSpaceNotebooks(space.id));
        notebookIds = [];
        for (const nb of nbs) {
          try {
            setKeyring(nb.notebookId, "notebook", spaceNotebookKeys(nb, keys.keys, space.id));
            notebookIds.push(nb.notebookId);
          } catch (e) {
            console.warn("[ds] cannot open the key of a notebook in a shared space", nb.notebookId, (e as Error).message);
          }
        }
      } catch (e) {
        console.warn("[ds] notebooks of a shared space unavailable", space.id, (e as Error).message);
      }
    }
    access[space.id] = {
      role: owned ? "owner" : item!.role,
      keyed: !!keys,
      notebookIds,
      ...(item ? { ownerEmail: item.owner.email } : {}),
    };
  }
  setSpaceAccess(access);
  await rt.syncSpaceDocs(Object.entries(access).filter(([, a]) => a.keyed).map(([id]) => id));
  useUi.setState({ keysChangedAt: Date.now() });
}

/** Online: ask and keep a copy; offline: the copy (keys are wrapped, the copy reveals nothing). */
async function cached<T>(key: string, fetch: () => Promise<T>): Promise<T> {
  try {
    const v = await fetch();
    await kvSet(key, v);
    return v;
  } catch (e) {
    const v = await kvGet<T>(key);
    if (v === undefined) throw e;
    return v;
  }
}

/** Member spaces in the switcher (document-model.md §2.1): new ones placed, gone ones cleaned up. */
function placeMemberSpaces(items: AccountSharedItem[], me: string) {
  const { removed } = reconcileSharedSpaces(runtime().account, items, me);
  for (const spaceId of removed) {
    if (!leaving.has(spaceId)) toast(i18n.t("spaces.gone"));
    void forgetMemberSpace(spaceId);
  }
}

/** A shared space this account no longer belongs to: its tabs, stars and local docs go. */
async function forgetMemberSpace(spaceId: string) {
  const rt = runtime();
  const st = useWorkspace.getState();
  const notebookIds = st.account.notebooks.filter((n) => n.spaceId === spaceId).map((n) => n.id);
  const nbs = new Set(notebookIds);
  const a = accountMaps(rt.account);
  rt.account.transact(() => {
    a.sharedSpaces.delete(spaceId);
    for (let i = a.starred.length - 1; i >= 0; i--) {
      const s = a.starred.get(i);
      const nb = s.kind === "notebook" ? s.id : s.kind === "folder" ? st.folders[s.id]?.notebookId : st.notes[s.id]?.notebookId;
      if (nb && nbs.has(nb)) a.starred.delete(i, 1);
    }
    for (let i = a.tabs.length - 1; i >= 0; i--) if (nbs.has(st.notes[a.tabs.get(i).noteId]?.notebookId ?? "")) a.tabs.delete(i, 1);
  });
  for (const id of notebookIds) await rt.dropShared({ kind: "notebook", id });
  await rt.dropSpaceDoc(spaceId);
  forgetSpaceKeys(spaceId);
}

/** «Выйти» from a shared space: remove itself, then forget it here. */
export async function leaveSpace(spaceId: string) {
  const me = useAuth.getState().userId;
  if (!me) return;
  leaving.add(spaceId);
  try {
    await sharingApi.removeMember({ kind: "space", id: spaceId }, me);
    memberItems = memberItems.filter((i) => i.target.id !== spaceId);
    await forgetMemberSpace(spaceId);
    await refreshSpaces();
  } finally {
    leaving.delete(spaceId);
  }
}

// ---------- the owner ----------

/**
 * «Пригласить в пространство…» / «Новое общее пространство»: the space gets its key and its space
 * doc (name, icon, notebooks), and its notebooks move into it (crypto.md §11.3) — members will
 * see their whole history. Needs the server.
 */
export async function makeSpaceShared(spaceId: string) {
  const rt = runtime();
  const st = useWorkspace.getState();
  const space = st.ownAccount.spaces.find((s) => s.id === spaceId);
  if (!space) throw new Error("no such space");
  const key = generateKey();
  await sharingApi.createSpace({ spaceId, wrappedKey: wrapSpaceKey(getMasterKey(), key, spaceId, 1) });
  setSpaceKeys(spaceId, { version: 1, keys: [key] });
  const notebooks = st.ownAccount.notebooks.filter((n) => n.spaceId === spaceId);
  await rt.store.create(spaceId, "space", null, (doc) => {
    createSpaceDoc(spaceId, { doc, name: space.name, icon: space.icon, color: space.color });
  });
  for (const nb of notebooks) await moveNotebookIn(spaceId, nb.id);
  accountMaps(rt.account).spaces.get(spaceId)?.set("shared", true);
  await refreshSpaces();
}

/** One own notebook into a shared space (§11.3): its current key wrapped by the space key. */
export async function moveNotebookIn(spaceId: string, notebookId: string) {
  const rt = runtime();
  await moveNotebookIntoSpace({
    api: sharingApi,
    spaceId,
    notebookId,
    masterKey: getMasterKey(),
    account: rt.account,
    spaceDoc: await rt.store.pin(spaceId),
  });
}

/**
 * Out of a shared space into a personal one (§11.3): a new notebook key, the owner's again, in one
 * request; then its notes get new keys (§10.3 steps 2–3). Former members keep only what they saw.
 */
export async function moveNotebookOut(spaceId: string, notebookId: string, toSpaceId: string) {
  const rt = runtime();
  const masterKey = getMasterKey();
  await moveNotebookOutOfSpace({
    api: sharingApi,
    spaceId,
    notebookId,
    masterKey,
    account: rt.account,
    spaceDoc: await rt.store.pin(spaceId),
    toSpaceId,
    onKeys: async (keys) => {
      setKeyring(notebookId, "notebook", keys);
      await refreshNotebookKeyCache(notebookId);
    },
  });
  const me = useAuth.getState().userId!;
  const pair = await accountBoxKeys();
  await rotateNotebookKey({
    api: sharingApi,
    notebookId,
    owner: { userId: me, secretKey: pair.secretKey },
    masterKey,
    index: await rt.store.load(notebookId),
    agentMode: useWorkspace.getState().account.notebooks.find((n) => n.id === notebookId)?.mode === "agent",
    whenIndexSent: () => rt.client.whenSent(notebookId),
    onKeys: async (k) => {
      if (k.notebook) setKeyring(notebookId, "notebook", k.notebook);
      for (const [noteId, nk] of k.notes ?? []) setKeyring(noteId, "note", nk);
    },
  });
  await refreshSpaces();
}

/**
 * A new notebook's key for a shared space (§11.2): wrapped by the current space key, version 1;
 * the server checks `spaceKeyVersion` against the space's current one.
 */
export function wrapNewNotebookKey(spaceId: string, notebookId: string, key: Uint8Array): { wrapped: string; spaceKeyVersion: number } {
  const keys = spaceKeysOf(spaceId);
  if (!keys) throw new Error("no space key");
  return { wrapped: wrapNotebookKeyForSpace(keys.keys[0]!, key, spaceId, notebookId, 1), spaceKeyVersion: keys.version };
}

/** The new notebook is in the space doc now; the server lists it (refresh its keys and lists). */
export function notebookCreatedInSpace() {
  void refreshSpaces();
}
