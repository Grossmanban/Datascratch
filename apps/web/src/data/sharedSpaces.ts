// Shared spaces (D-62, spec/08 «Общие пространства», crypto.md §11, api.md «Общие пространства»).
// One pass after every «Общие со мной» read: which shared spaces this account owns or belongs to,
// their keys (the owner's from GET /spaces/:id/key, a member's from its SharedItem), the keys of
// their notebooks (GET /spaces/:id/notebooks), keys for members who accepted, and the owner's key
// change after someone left. Plus the owner's commands: make a space shared, move a notebook in
// and out, create a notebook in a shared space (domain/actions).
import {
  accountVetting,
  deliverAwaitingKeys,
  generateKey,
  getNoteMetas,
  noteKeysFromMeta,
  ownerNotebookKeys,
  patchNoteMeta,
  toBase64Url,
  uuidv7,
  wrapKey,
  wrapPreviousKey,
  AD,
  type Member,
  type ShareTarget,
  type VersionedKeys,
} from "@datascratch/shared";
import type * as Y from "yjs";
import { z } from "zod";
import { spacesApi, notebooksApi, type ServerSpace, type SpaceKeyResponse, type SpaceNotebookKey } from "@/api/endpoints";
import { getMasterKey, useAuth } from "@/auth/session";
import { accountMaps } from "@/domain/account";
import { initSpaceDoc, spaceMaps, withoutSpace } from "@/domain/space";
import { setSpaceAccess, useWorkspace, type SpaceAccess } from "@/domain/workspace";
import { toYMap } from "@/domain/ymap";
import { useUi } from "@/hooks/useUi";
import i18n from "@/i18n";
import { toast } from "@/ui";
import { kvGet, kvSet } from "./db";
import { forgetSpaceKeys, refreshNotebookKeyCache, setKeyring, setSpaceKeys, spaceKeysOf } from "./keys";
import { confirmMember } from "./ownerShares";
import { runtime } from "./runtime";
import { accountBoxKeys, sharingApi } from "./sharing";
import {
  memberSpaceKeys,
  ownerSpaceKeys,
  spaceNotebookKeys,
  wrapNotebookKeyForOwner,
  wrapNotebookKeyForSpace,
  wrapSpaceKeyForMember,
  wrapSpaceKeyForOwner,
} from "./spaceCrypto";

/** A `SharedItem` with `target.kind = "space"` (api.md «Общие пространства»). */
export const spaceItemSchema = z.object({
  target: z.object({ kind: z.literal("space"), id: z.string().uuid() }),
  owner: z.object({ userId: z.string().uuid(), email: z.string(), publicKey: z.string() }),
  role: z.enum(["editor", "viewer"]),
  keyVersion: z.number().int().positive(),
  wrappedKey: z.string().nullable(),
  keyChain: z.array(z.string()),
  docIds: z.array(z.string()),
  addedAt: z.string(),
});
export type SpaceItem = z.infer<typeof spaceItemSchema>;

const spaceTarget = (id: string) => ({ kind: "space", id }) as unknown as ShareTarget;

let memberItems: SpaceItem[] = [];
let running: Promise<void> | null = null;
let again = false;
/** Spaces this account is leaving itself: no «access closed» notice for them. */
const leaving = new Set<string>();

/** The member side of «Общие со мной» for whole spaces, then one pass over all shared spaces. */
export async function applySpaceItems(items: SpaceItem[], fromServer: boolean) {
  const me = useAuth.getState().userId;
  memberItems = items.filter((i) => {
    if (i.owner.userId !== me) return true;
    console.error("[ds] ignored a shared space item that points at this account's own space", i.target.id);
    return false;
  });
  if (fromServer) placeMemberSpaces();
  await refreshSpaces();
  // Accepted but not keyed yet: the owner's client delivers the key once it is online — look again soon.
  clearTimeout(soon);
  if (memberItems.some((i) => !i.wrappedKey)) soon = setTimeout(() => void import("./sharedWithMe").then((m) => m.refreshShared()), 15_000);
}
let soon: ReturnType<typeof setTimeout> | undefined;

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
  let list: ServerSpace[];
  try {
    list = await spacesApi.list();
    await kvSet("spaces", list);
  } catch {
    list = (await kvGet<ServerSpace[]>("spaces")) ?? [];
  }
  const access: Record<string, SpaceAccess> = {};
  for (const space of list) {
    const owned = space.ownerUserId === me;
    const item = memberItems.find((i) => i.target.id === space.id);
    if (!owned && !item) continue;
    let keys: VersionedKeys | null = null;
    try {
      keys = owned ? ownerSpaceKeys(await cached(`spacekey:${space.id}`, () => spacesApi.key(space.id)), getMasterKey(), space.id) : memberSpaceKeys(item!, { userId: me, secretKey: pair.secretKey });
    } catch (e) {
      console.warn("[ds] cannot open the key of a shared space", space.id, (e as Error).message);
    }
    if (keys) setSpaceKeys(space.id, keys);
    let notebookIds: string[] | null = null;
    if (keys) {
      try {
        const nbs = await cached(`spacenbs:${space.id}`, () => spacesApi.notebooks(space.id));
        notebookIds = [];
        for (const nb of nbs) {
          try {
            setKeyring(nb.notebookId, "notebook", spaceNotebookKeys(nb, space.id, keys.keys));
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
    if (owned && keys && useWorkspace.getState().accountSynced) await ownerUpkeep(space, keys, { userId: me, secretKey: pair.secretKey });
  }
  setSpaceAccess(access);
  await runtime().syncSpaceDocs(Object.entries(access).filter(([, a]) => a.keyed).map(([id]) => id));
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

/** Member spaces in the switcher (document-model.md §2.1): new ones last, gone ones cleaned up. */
function placeMemberSpaces() {
  const rt = runtime();
  const placed = accountMaps(rt.account).sharedSpaces;
  const ids = new Set(memberItems.map((i) => i.target.id));
  rt.account.transact(() => {
    let order = Math.max(0, ...[...placed.values()].map((v) => (v as Y.Map<number>).get?.("order") ?? 0));
    for (const item of memberItems)
      if (!placed.has(item.target.id)) placed.set(item.target.id, toYMap({ order: ++order, addedAt: item.addedAt }));
  });
  for (const spaceId of [...placed.keys()]) {
    if (ids.has(spaceId)) continue;
    if (!leaving.has(spaceId)) toast(i18n.t("spaces.gone"));
    void forgetMemberSpace(spaceId);
  }
}

/** A shared space this account no longer belongs to: its placement, tabs, stars and local docs go. */
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
    await sharingApi.removeMember(spaceTarget(spaceId), me);
    memberItems = memberItems.filter((i) => i.target.id !== spaceId);
    await forgetMemberSpace(spaceId);
    await refreshSpaces();
  } finally {
    leaving.delete(spaceId);
  }
}

// ---------- the owner ----------

/**
 * The owner's upkeep of one shared space: the space key for members who accepted (an account made
 * after its invitation, or unknown to this account's record, only after «Открыть доступ»), and the
 * key change after someone left (crypto.md §11.4), resumed if it was interrupted.
 */
async function ownerUpkeep(space: ServerSpace, keys: VersionedKeys, owner: { userId: string; secretKey: Uint8Array }) {
  const rt = runtime();
  if (space.keyRotationPending) {
    try {
      await rotateSpace(space, keys, owner);
      keys = spaceKeysOf(space.id) ?? keys;
    } catch (e) {
      console.warn("[ds] shared space key change failed (will retry)", space.id, (e as Error).message);
      return;
    }
  }
  await deliverAwaitingKeys({
    api: sharingApi,
    target: spaceTarget(space.id),
    keys,
    owner,
    confirm: (member: Member, reason) => confirmMember(spaceTarget(space.id), member, reason),
    vetting: accountVetting(() => rt.account),
  }).catch((e) => console.warn("[ds] space key delivery failed", space.id, (e as Error).message));
}

/**
 * crypto.md §11.4: a new space key for the owner and every remaining active member, and a new key
 * for every notebook of the space wrapped by it — one request; then every note gets a new key;
 * then `rotate/done`. Step 1 is skipped when the key version is already past `pendingSinceVersion`.
 */
async function rotateSpace(space: ServerSpace, keys: VersionedKeys, owner: { userId: string; secretKey: Uint8Array }) {
  const rt = runtime();
  const master = getMasterKey();
  const notebooks = await spacesApi.notebooks(space.id);
  const resuming = space.pendingSinceVersion != null && keys.version > space.pendingSinceVersion;
  const nbKeys = new Map<string, VersionedKeys>(notebooks.map((nb) => [nb.notebookId, spaceNotebookKeys(nb, space.id, keys.keys)]));
  if (!resuming) {
    const version = keys.version + 1;
    const spaceKey = generateKey();
    const active = (await sharingApi.listMembers(spaceTarget(space.id))).filter((m) => m.status === "active" && m.userId !== owner.userId);
    const memberKeys = [];
    for (const m of active) {
      const pk = await sharingApi.getPublicKey(m.userId);
      if (!pk) throw new Error(`no public key for member ${m.userId}`);
      memberKeys.push({ userId: m.userId, wrappedKey: wrapSpaceKeyForMember(spaceKey, version, space.id, owner, { userId: m.userId, publicKey: pk.publicKey }) });
    }
    const agent = (id: string) => notebooks.find((n) => n.notebookId === id)?.mode === "agent";
    const nextNbs = new Map<string, VersionedKeys>();
    const body = notebooks.map((nb) => {
      const old = nbKeys.get(nb.notebookId)!;
      const v = old.version + 1;
      const k = generateKey();
      nextNbs.set(nb.notebookId, { version: v, keys: [k, ...old.keys] });
      return {
        notebookId: nb.notebookId,
        version: v,
        spaceWrappedKey: wrapNotebookKeyForSpace(spaceKey, k, space.id, nb.notebookId, v),
        previousKeyWrap: wrapPreviousKey(k, old.keys[0]!, "notebook", nb.notebookId, v),
        ...(agent(nb.notebookId) ? { notebookKey: toBase64Url(k) } : {}),
      };
    });
    await spacesApi.rotate(space.id, {
      version,
      ownerWrappedKey: wrapSpaceKeyForOwner(master, spaceKey, space.id, version),
      previousKeyWrap: wrapPreviousKey(spaceKey, keys.keys[0]!, "space" as never, space.id, version),
      memberKeys,
      notebooks: body,
    });
    const next = { version, keys: [spaceKey, ...keys.keys] };
    setSpaceKeys(space.id, next);
    for (const [id, k] of nextNbs) {
      setKeyring(id, "notebook", k);
      nbKeys.set(id, k);
    }
    await kvSet(`spacekey:${space.id}`, await spacesApi.key(space.id)).catch(() => undefined);
    await kvSet(`spacenbs:${space.id}`, await spacesApi.notebooks(space.id)).catch(() => undefined);
  }
  // Step 2: notes still under an older notebook key get a new note key.
  for (const [notebookId, k] of nbKeys) {
    const index = await rt.store.load(notebookId);
    const rekeyed = rekeyNotes(index, k);
    await rt.client.whenSent(notebookId);
    for (const [noteId, nk] of rekeyed) setKeyring(noteId, "note", nk);
  }
  await spacesApi.rotateDone(space.id);
}

/** Every note under an older notebook key gets a new noteKey, written into the index (§10.3 step 2). */
function rekeyNotes(index: Y.Doc, notebook: VersionedKeys): Map<string, VersionedKeys> {
  const out = new Map<string, VersionedKeys>();
  index.transact(() => {
    for (const meta of getNoteMetas(index, { includeTrashed: true })) {
      const old = noteKeysFromMeta(meta, notebook.keys);
      if (old.notebookIndex === 0) continue;
      const version = old.version + 1;
      const key = generateKey();
      patchNoteMeta(index, meta.id, {
        wrappedKey: wrapKey(notebook.keys[0]!, key, AD.noteKeyVersion(meta.id, version)),
        keyVersion: version,
        keyChain: [wrapPreviousKey(key, old.keys[0]!, "note", meta.id, version), ...(meta.keyChain ?? [])],
      });
      out.set(meta.id, { version, keys: [key, ...old.keys] });
    }
  });
  return out;
}

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
  await spacesApi.create(spaceId, wrapSpaceKeyForOwner(getMasterKey(), key, spaceId, 1));
  setSpaceKeys(spaceId, { version: 1, keys: [key] });
  const notebooks = st.ownAccount.notebooks.filter((n) => n.spaceId === spaceId);
  await rt.store.create(spaceId, "space" as never, null, (doc) =>
    initSpaceDoc(doc, { spaceId, name: space.name, icon: space.icon, color: space.color }),
  );
  for (const nb of notebooks) await moveNotebookIn(spaceId, nb.id);
  accountMaps(rt.account).spaces.get(spaceId)?.set("shared", true);
  await refreshSpaces();
}

/** One own notebook into a shared space (§11.3): its current key wrapped by the space key. */
export async function moveNotebookIn(spaceId: string, notebookId: string) {
  const rt = runtime();
  const spaceKey = spaceKeysOf(spaceId)?.keys[0];
  if (!spaceKey) throw new Error("no space key");
  const nbKeys = ownerNotebookKeys(await notebooksApi.key(notebookId), getMasterKey(), notebookId);
  await spacesApi.moveIn(spaceId, notebookId, {
    version: nbKeys.version,
    spaceWrappedKey: wrapNotebookKeyForSpace(spaceKey, nbKeys.keys[0]!, spaceId, notebookId, nbKeys.version),
  });
  const own = accountMaps(rt.account).notebooks;
  const ref = own.get(notebookId)?.toJSON() as Parameters<typeof withoutSpace>[0] | undefined;
  const spaceDoc = await rt.store.pin(spaceId);
  rt.account.transact(() => own.delete(notebookId));
  if (ref) spaceDoc.transact(() => spaceMaps(spaceDoc).notebooks.set(notebookId, toYMap(withoutSpace({ ...ref, spaceId }))));
}

/**
 * Out of a shared space into a personal one (§11.3): a new notebook key, the owner's again, in one
 * request; then its notes get new keys. Former members keep only what they saw.
 */
export async function moveNotebookOut(spaceId: string, notebookId: string, toSpaceId: string) {
  const rt = runtime();
  const spaceKeys = spaceKeysOf(spaceId);
  if (!spaceKeys) throw new Error("no space key");
  const entry = (await spacesApi.notebooks(spaceId)).find((n) => n.notebookId === notebookId);
  if (!entry) throw new Error("notebook is not in the space");
  const old = spaceNotebookKeys(entry, spaceId, spaceKeys.keys);
  const version = old.version + 1;
  const key = generateKey();
  await spacesApi.moveOut(spaceId, notebookId, {
    version,
    ownerWrappedKey: wrapNotebookKeyForOwner(getMasterKey(), key, notebookId, version),
    previousKeyWrap: wrapPreviousKey(key, old.keys[0]!, "notebook", notebookId, version),
    ...(entry.mode === "agent" ? { notebookKey: toBase64Url(key) } : {}),
  });
  const next = { version, keys: [key, ...old.keys] };
  setKeyring(notebookId, "notebook", next);
  await refreshNotebookKeyCache(notebookId);
  const spaceDoc = await rt.store.pin(spaceId);
  const ref = spaceMaps(spaceDoc).notebooks.get(notebookId)?.toJSON() as Record<string, unknown> | undefined;
  spaceDoc.transact(() => spaceMaps(spaceDoc).notebooks.delete(notebookId));
  const order = Math.max(0, ...useWorkspace.getState().ownAccount.notebooks.filter((n) => n.spaceId === toSpaceId).map((n) => n.order)) + 1;
  if (ref) rt.account.transact(() => accountMaps(rt.account).notebooks.set(notebookId, toYMap({ ...ref, spaceId: toSpaceId, order })));
  const index = await rt.store.load(notebookId);
  const rekeyed = rekeyNotes(index, next);
  await rt.client.whenSent(notebookId);
  for (const [noteId, nk] of rekeyed) setKeyring(noteId, "note", nk);
  await sharingApi.rotateKeyDone({ kind: "notebook", id: notebookId }).catch(() => undefined);
  await refreshSpaces();
}

/** A new notebook's key for a shared space (§11.2): wrapped by the space key, version 1. */
export function wrapNewNotebookKey(spaceId: string, notebookId: string, key: Uint8Array): string {
  const spaceKey = spaceKeysOf(spaceId)?.keys[0];
  if (!spaceKey) throw new Error("no space key");
  return wrapNotebookKeyForSpace(spaceKey, key, spaceId, notebookId, 1);
}

/** The new notebook is in the space doc now; the server lists it (refresh its keys and lists). */
export function notebookCreatedInSpace() {
  void refreshSpaces();
}

export type { SpaceNotebookKey, SpaceKeyResponse };
export { uuidv7 };
