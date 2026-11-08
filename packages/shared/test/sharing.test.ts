import * as Y from "yjs";
import type * as SharedIndex from "../src/index.js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  AD,
  ApiRequestError,
  MemberNotConfirmedError,
  accountRoots,
  accountVetting,
  isTrustMigrated,
  knownKeyVersion,
  markTrustMigrated,
  memberTrust,
  migrateMemberTrust,
  recordInvite,
  recordKeyVersion,
  recordMemberKey,
  MemorySyncHub,
  MemorySyncStorage,
  SyncClient,
  createHttpClient,
  createSharingApi,
  deliverAwaitingKeys,
  ensureAccountKeyPair,
  generateKey,
  getNoteMeta,
  getSharedRefs,
  initCrypto,
  noteKeysFromMeta,
  ownerNotebookKeys,
  putNoteMeta,
  putSharedRef,
  reconcileSharedRefs,
  repairSharedNoteMeta,
  parseShareLink,
  recreateShareLinks,
  maintainOwnedShares,
  rotateNotebookKey,
  rotateSharedNoteKey,
  sharedItemKeys,
  toBase64Url,
  wrapKey,
  type BoxKeyPair,
  type Member,
  type NoteMeta,
  type AccountSharedItem,
  type SharedItem,
  type Share,
  type SharingApi,
  type SpaceNotebook,
} from "../src/index.js";

beforeAll(async () => {
  await initCrypto();
});

const OWNER = "0192f3c4-0000-7000-8000-00000000a001";
const ALICE = "0192f3c4-0000-7000-8000-00000000a002";
const BOB = "0192f3c4-0000-7000-8000-00000000a003";
const NB = "0192f3c4-0000-7000-8000-00000000b001";
const NOTE1 = "0192f3c4-0000-7000-8000-00000000c001";
const NOTE2 = "0192f3c4-0000-7000-8000-00000000c002";
const T = "2026-10-27T12:00:00.000Z";

interface Resource {
  kind: "notebook" | "note" | "space";
  id: string;
  version: number;
  ownerWrappedKey: string;
  keyChain: string[];
  pending: boolean;
  pendingSince?: number | null;
  members: Map<string, { role: "editor" | "viewer"; wrappedKey: string | null; late?: boolean }>;
  /** kind = space: its notebooks' keys under the spaceKey. */
  notebooks?: Map<string, SpaceNotebook>;
}

/** In-memory server for the D-54 endpoints (api.md), enough for client flows. */
class FakeServer {
  boxKeys = new Map<string, { publicKey: string; wrappedSecretKey: string }>();
  resources = new Map<string, Resource>();
  calls: string[] = [];
  shares = new Map<string, Share>();

  api(userId: string): SharingApi {
    return createSharingApi(
      createHttpClient({
        baseUrl: "https://ds.test",
        accessToken: () => userId,
        fetch: (async (url: string, init: RequestInit) =>
          this.handle(
            userId,
            init.method ?? "GET",
            new URL(url).pathname,
            init.body,
          )) as typeof fetch,
      }),
    );
  }

  private res(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  }

  private handle(me: string, method: string, path: string, raw: unknown): Response {
    const body = raw ? JSON.parse(String(raw)) : undefined;
    const p = path.replace(/^\/v1/, "");
    this.calls.push(`${method} ${p}`);
    let m: RegExpMatchArray | null;
    if (
      (m = p.match(
        /^\/spaces\/([^/]+)\/(notebooks|rotate\/done|rotate)(?:\/([^/]+)(\/move-out)?)?$/,
      ))
    ) {
      const r = this.resources.get(`space:${m[1]}`)!;
      const [, , what, nbId, moveOut] = m;
      if (what === "notebooks" && !nbId) return this.res(200, [...r.notebooks!.values()]);
      if (what === "notebooks" && moveOut) {
        const e = r.notebooks!.get(nbId!)!;
        if (body.version !== e.version + 1)
          return this.res(409, { error: { code: "conflict", message: "version" } });
        r.notebooks!.delete(nbId!);
        this.resources.set(`notebook:${nbId}`, {
          kind: "notebook",
          id: nbId!,
          version: body.version,
          ownerWrappedKey: body.ownerWrappedKey,
          keyChain: [body.previousKeyWrap, ...e.keyChain],
          pending: true,
          pendingSince: e.version,
          members: new Map(),
        });
        return this.res(204);
      }
      if (what === "notebooks" && method === "PUT") {
        const nb = this.resources.get(`notebook:${nbId}`)!;
        if (body.version !== nb.version)
          return this.res(409, { error: { code: "conflict", message: "version" } });
        this.resources.delete(`notebook:${nbId}`);
        r.notebooks!.set(nbId!, {
          notebookId: nbId!,
          version: nb.version,
          spaceWrappedKey: body.spaceWrappedKey,
          keyChain: nb.keyChain,
          mode: "private",
        });
        return this.res(204);
      }
      if (what === "rotate") {
        if (body.version !== r.version + 1)
          return this.res(409, { error: { code: "conflict", message: "version" } });
        const ids = new Set(body.notebooks.map((n: { notebookId: string }) => n.notebookId));
        if (ids.size !== r.notebooks!.size)
          return this.res(409, { error: { code: "conflict", message: "notebooks" } });
        r.version = body.version;
        r.ownerWrappedKey = body.ownerWrappedKey;
        r.keyChain = [body.previousKeyWrap, ...r.keyChain];
        for (const k of body.memberKeys) r.members.get(k.userId)!.wrappedKey = k.wrappedKey;
        for (const n of body.notebooks) {
          const e = r.notebooks!.get(n.notebookId)!;
          if (n.version !== e.version + 1)
            return this.res(409, { error: { code: "conflict", message: "nb version" } });
          r.notebooks!.set(n.notebookId, {
            ...e,
            version: n.version,
            spaceWrappedKey: n.spaceWrappedKey,
            keyChain: [n.previousKeyWrap, ...e.keyChain],
          });
        }
        if (!r.pending) r.pendingSince = r.version - 1;
        r.pending = true;
        return this.res(204);
      }
      if (what === "rotate/done") {
        r.pending = false;
        r.pendingSince = null;
        return this.res(204);
      }
    }
    if (p === "/me/box-key") {
      if (method === "GET")
        return this.boxKeys.has(me)
          ? this.res(200, this.boxKeys.get(me))
          : this.res(404, { error: { code: "not_found", message: "" } });
      if (this.boxKeys.has(me)) return this.res(409, { error: { code: "conflict", message: "" } });
      this.boxKeys.set(me, body);
      return this.res(204);
    }
    if ((m = p.match(/^\/users\/([^/]+)\/public-key$/))) {
      const k = this.boxKeys.get(m[1]!);
      return k
        ? this.res(200, { userId: m[1], publicKey: k.publicKey })
        : this.res(404, { error: { code: "not_found", message: "" } });
    }
    if (p === "/shares" && method === "GET") return this.res(200, [...this.shares.values()]);
    if (p === "/shares" && method === "POST") {
      const share: Share = {
        id: body.shareId,
        target: body.target,
        permission: body.permission,
        expiresAt: body.expiresAt,
        createdAt: T,
      };
      this.shares.set(share.id, share);
      return this.res(200, share);
    }
    if ((m = p.match(/^\/shares\/([^/]+)$/)) && method === "DELETE") {
      this.shares.delete(m[1]!);
      return this.res(204);
    }
    if ((m = p.match(/^\/spaces\/([^/]+)\/key$/))) {
      const r = this.resources.get(`space:${m[1]}`)!;
      return this.res(200, {
        version: r.version,
        wrappedKey: r.ownerWrappedKey,
        keyChain: r.keyChain,
        keyRotationPending: r.pending,
        pendingSinceVersion: r.pending ? (r.pendingSince ?? null) : null,
      });
    }
    if ((m = p.match(/^\/notebooks\/([^/]+)\/key$/))) {
      const r = this.resources.get(`notebook:${m[1]}`)!;
      return this.res(200, {
        wrappedKey: r.ownerWrappedKey,
        version: r.version,
        keyChain: r.keyChain,
        keyRotationPending: r.pending,
        pendingSinceVersion: r.pending ? (r.pendingSince ?? null) : null,
      });
    }
    if ((m = p.match(/^\/members\/note\/([^/]+)\/key$/))) {
      const r = this.resources.get(`note:${m[1]}`)!;
      return this.res(200, {
        version: r.version,
        ownerWrappedKey: r.ownerWrappedKey,
        keyChain: r.keyChain,
      });
    }
    if (p === "/invitations" && method === "GET") return this.res(200, []);
    if (p === "/shared-by-me") {
      return this.res(
        200,
        [...this.resources.values()].map((r) => ({
          target: { kind: r.kind, id: r.id },
          keyVersion: r.version,
          keyRotationPending: r.pending,
          pendingSinceVersion: r.pending ? (r.pendingSince ?? null) : null,
          members: r.members.size,
          awaitingKey: [...r.members.values()].filter((v) => !v.wrappedKey).length,
        })),
      );
    }
    if (p === "/shared-with-me") {
      const items: AccountSharedItem[] = [];
      for (const r of this.resources.values()) {
        const mem = r.members.get(me);
        if (!mem) continue;
        items.push({
          target: { kind: r.kind, id: r.id },
          owner: { userId: OWNER, email: "o@x.co", publicKey: this.boxKeys.get(OWNER)!.publicKey },
          role: mem.role,
          keyVersion: r.version,
          wrappedKey: mem.wrappedKey,
          keyChain: r.keyChain,
          docIds: [r.id],
          addedAt: T,
        });
      }
      return this.res(200, items);
    }
    if ((m = p.match(/^\/members\/(notebook|note|space)\/([^/]+)(?:\/(.*))?$/))) {
      const r = this.resources.get(`${m[1]}:${m[2]}`)!;
      const rest = m[3];
      if (!rest && method === "GET") {
        const list: Member[] = [...r.members].map(([userId, v]) => ({
          userId,
          email: `${userId}@x.co`,
          role: v.role,
          status: v.wrappedKey ? "active" : "awaiting_key",
          joinedAt: T,
          accountCreatedAfterInvite: v.late ?? false,
        }));
        return this.res(200, list);
      }
      if (rest === "rotate") {
        if (body.version !== r.version + 1)
          return this.res(409, { error: { code: "conflict", message: "version" } });
        const ids = new Set(body.memberKeys.map((k: { userId: string }) => k.userId));
        const active = [...r.members].filter(([, v]) => v.wrappedKey).map(([u]) => u);
        if (ids.size !== active.length || active.some((u) => !ids.has(u)))
          return this.res(409, { error: { code: "conflict", message: "members" } });
        r.version = body.version;
        r.ownerWrappedKey = body.ownerWrappedKey;
        r.keyChain = [body.previousKeyWrap, ...r.keyChain];
        for (const k of body.memberKeys) r.members.get(k.userId)!.wrappedKey = k.wrappedKey;
        if (r.kind === "note") r.pending = false;
        return this.res(204);
      }
      if (rest === "rotate/done") {
        r.pending = false;
        r.pendingSince = null;
        return this.res(204);
      }
      if ((m = rest?.match(/^([^/]+)\/key$/) ?? null)) {
        if (body.version !== r.version)
          return this.res(409, { error: { code: "conflict", message: "version" } });
        r.members.get(m[1]!)!.wrappedKey = body.wrappedKey;
        return this.res(204);
      }
      if (rest && method === "DELETE") {
        r.members.delete(rest);
        if (!r.pending) r.pendingSince = r.version;
        r.pending = true;
        return this.res(204);
      }
    }
    return this.res(404, { error: { code: "not_found", message: p } });
  }
}

interface Setup {
  server: FakeServer;
  owner: BoxKeyPair;
  masterKey: Uint8Array;
  nbKey: Uint8Array;
  noteKeys: Map<string, Uint8Array>;
  index: Y.Doc;
  alice: BoxKeyPair;
}

const meta = (id: string, wrappedKey: string): NoteMeta => ({
  id,
  folderId: null,
  parentNoteId: null,
  title: id,
  kind: "note",
  dailyDate: null,
  tags: [],
  icon: null,
  coverThumb: null,
  wrappedKey,
  createdAt: T,
  updatedAt: T,
  trashedAt: null,
  order: 1,
});

async function setup(): Promise<Setup> {
  const server = new FakeServer();
  const masterKey = generateKey();
  const owner = await ensureAccountKeyPair(server.api(OWNER), OWNER, masterKey);
  const alice = await ensureAccountKeyPair(server.api(ALICE), ALICE, generateKey());
  await ensureAccountKeyPair(server.api(BOB), BOB, generateKey());
  const nbKey = generateKey();
  server.resources.set(`notebook:${NB}`, {
    kind: "notebook",
    id: NB,
    version: 1,
    ownerWrappedKey: wrapKey(masterKey, nbKey, AD.notebookKey(NB)),
    keyChain: [],
    pending: false,
    members: new Map([
      [ALICE, { role: "editor", wrappedKey: null }],
      [BOB, { role: "viewer", wrappedKey: null, late: true }],
    ]),
  });
  const index = new Y.Doc();
  const noteKeys = new Map<string, Uint8Array>();
  for (const id of [NOTE1, NOTE2]) {
    const k = generateKey();
    noteKeys.set(id, k);
    putNoteMeta(index, meta(id, wrapKey(nbKey, k, AD.noteKey(id))));
  }
  return { server, owner, masterKey, nbKey, noteKeys, index, alice };
}

async function memberKeys(server: FakeServer, userId: string, secretKey: Uint8Array) {
  const items = await server.api(userId).sharedWithMe();
  return sharedItemKeys(items[0]!, { userId, secretKey });
}

describe("account key pair", () => {
  it("is created once and reused, also when another device won the race", async () => {
    const server = new FakeServer();
    const masterKey = generateKey();
    const a = await ensureAccountKeyPair(server.api(OWNER), OWNER, masterKey);
    const b = await ensureAccountKeyPair(server.api(OWNER), OWNER, masterKey);
    expect(b.publicKey).toEqual(a.publicKey);
    expect(b.secretKey).toEqual(a.secretKey);
    // Race: GET says none, PUT answers 409 → the published pair is used.
    const api = server.api(OWNER);
    const racing = {
      ...api,
      getBoxKey: (() => {
        let first = true;
        return () => (first ? ((first = false), Promise.resolve(null)) : api.getBoxKey());
      })(),
    };
    const c = await ensureAccountKeyPair(racing, OWNER, masterKey);
    expect(c.secretKey).toEqual(a.secretKey);
  });
});

describe("member keys", () => {
  it("delivers the key to accepted members, who open notebook and note keys", async () => {
    const s = await setup();
    const api = s.server.api(OWNER);
    const keys = ownerNotebookKeys(await api.getNotebookKey(NB), s.masterKey, NB);
    expect(keys.keys[0]).toEqual(s.nbKey);
    expect(await memberKeys(s.server, ALICE, new Uint8Array(32))).toBeNull();
    const asked: string[] = [];
    const args = {
      api,
      target: { kind: "notebook" as const, id: NB },
      keys,
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
    };
    // Bob's account was created after the invitation: no key without the owner's yes.
    const delivered = await deliverAwaitingKeys(args);
    expect(delivered.map((m) => m.userId)).toEqual([ALICE]);
    const later = await deliverAwaitingKeys({
      ...args,
      confirm: (m) => (asked.push(m.userId), true),
    });
    expect(later.map((m) => m.userId)).toEqual([BOB]);
    expect(asked).toEqual([BOB]);
    expect((await memberKeys(s.server, ALICE, s.alice.secretKey))!.keys).toEqual([s.nbKey]);
  });
});

describe("trust record (security review 2026-11-02)", () => {
  const target = { kind: "notebook" as const, id: NB };

  it("knows invited addresses and pinned keys; takes over everyone only before migration", () => {
    const account = new Y.Doc();
    const m = { userId: ALICE, email: "Alice@X.co" };
    expect(memberTrust(account, target, m, "pk1")).toBe("known");
    markTrustMigrated(account);
    expect(memberTrust(account, target, m, "pk1")).toBe("not_invited");
    recordInvite(account, target, " alice@x.co ");
    expect(memberTrust(account, target, m, "pk1")).toBe("known");
    recordMemberKey(account, target, ALICE, "pk1");
    expect(memberTrust(account, target, m, "pk1")).toBe("known");
    expect(memberTrust(account, target, m, "pk2")).toBe("key_changed");
    expect(knownKeyVersion(account, target)).toBe(0);
    recordKeyVersion(account, target, 1);
    expect(accountRoots(account).trust.size).toBe(3); // migrated, invite, member: version 1 is not written
    recordKeyVersion(account, target, 3);
    recordKeyVersion(account, target, 2);
    expect(knownKeyVersion(account, target)).toBe(3);
  });

  it("a member the server names but this account never invited gets no key without a yes", async () => {
    const s = await setup();
    const api = s.server.api(OWNER);
    const account = new Y.Doc();
    await migrateMemberTrust(api, account, OWNER);
    expect(isTrustMigrated(account)).toBe(true);
    // The migration took over Alice and Bob (they had accepted before the record existed).
    const asked: [string, string][] = [];
    const args = {
      api,
      target,
      keys: ownerNotebookKeys(await api.getNotebookKey(NB), s.masterKey, NB),
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
      vetting: accountVetting(() => account),
      confirm: (m: { userId: string }, reason: string) => (asked.push([m.userId, reason]), false),
    };
    expect((await deliverAwaitingKeys(args)).map((m) => m.userId)).toEqual([ALICE]);
    expect(asked).toEqual([[BOB, "late_account"]]);
    // Someone the server adds afterwards is not taken over.
    const MALLORY = "01900000-0000-7000-8000-00000000000f";
    await ensureAccountKeyPair(s.server.api(MALLORY), MALLORY, generateKey());
    s.server.resources
      .get(`notebook:${NB}`)!
      .members.set(MALLORY, { role: "viewer", wrappedKey: null });
    asked.length = 0;
    expect(await deliverAwaitingKeys(args)).toEqual([]);
    expect(asked).toEqual([
      [BOB, "late_account"],
      [MALLORY, "not_invited"],
    ]);
    // A rotation will not hand the new key to an active member the record does not know.
    s.server.resources.get(`notebook:${NB}`)!.members.get(MALLORY)!.wrappedKey = "x";
    s.server.resources.get(`notebook:${NB}`)!.pending = true;
    await expect(
      rotateNotebookKey({
        api,
        notebookId: NB,
        owner: args.owner,
        masterKey: s.masterKey,
        index: s.index,
        agentMode: false,
        onKeys: () => {},
        whenIndexSent: async () => {},
        vetting: args.vetting,
        confirm: () => false,
      }),
    ).rejects.toBeInstanceOf(MemberNotConfirmedError);
  });
});

describe("notebook key rotation", () => {
  it("rotates, re-keys every note, keeps old keys readable and clears the flag", async () => {
    const s = await setup();
    const ownerApi = s.server.api(OWNER);
    await deliverAwaitingKeys({
      api: ownerApi,
      target: { kind: "notebook", id: NB },
      keys: { version: 1, keys: [s.nbKey] },
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
    });
    await ownerApi.removeMember({ kind: "notebook", id: NB }, BOB);

    const seen: string[] = [];
    let sentCalled = false;
    const r = await rotateNotebookKey({
      api: ownerApi,
      notebookId: NB,
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
      masterKey: s.masterKey,
      index: s.index,
      agentMode: false,
      onKeys: (k) => void seen.push(k.notebook ? "notebook" : `notes:${k.notes!.size}`),
      whenIndexSent: async () => void (sentCalled = true),
    });
    expect(r).toMatchObject({ rotated: true, newVersion: true, rekeyedNotes: 2 });
    expect(r.notebook.version).toBe(2);
    expect(seen).toEqual(["notebook", "notes:2"]);
    expect(sentCalled).toBe(true);
    expect(s.server.resources.get(`notebook:${NB}`)!.pending).toBe(false);

    // Alice: new notebook key, old one via the chain; notes re-keyed with their old keys kept.
    const ak = (await memberKeys(s.server, ALICE, s.alice.secretKey))!;
    expect(ak.version).toBe(2);
    expect(ak.keys[1]).toEqual(s.nbKey);
    for (const id of [NOTE1, NOTE2]) {
      const m = getNoteMeta(s.index, id)!;
      expect(m.keyVersion).toBe(2);
      const nk = noteKeysFromMeta(m, ak.keys);
      expect(nk.notebookIndex).toBe(0);
      expect(nk.keys[1]).toEqual(s.noteKeys.get(id));
      expect(nk.keys[0]).not.toEqual(s.noteKeys.get(id));
    }
    // Nothing pending → no-op.
    const again = await rotateNotebookKey({
      api: ownerApi,
      notebookId: NB,
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
      masterKey: s.masterKey,
      index: s.index,
      agentMode: false,
      onKeys: () => {},
      whenIndexSent: async () => {},
    });
    expect(again.rotated).toBe(false);
  });

  it("resumes after a crash between rotate and the index push without a second version", async () => {
    const s = await setup();
    const ownerApi = s.server.api(OWNER);
    await ownerApi.removeMember({ kind: "notebook", id: NB }, BOB);
    const opts = {
      api: ownerApi,
      notebookId: NB,
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
      masterKey: s.masterKey,
      index: s.index,
      agentMode: true,
      whenIndexSent: async () => {},
    };
    await expect(
      rotateNotebookKey({
        ...opts,
        onKeys: () => {
          throw new Error("crash");
        },
      }),
    ).rejects.toThrow("crash");
    expect(s.server.resources.get(`notebook:${NB}`)!.version).toBe(2);
    expect(s.server.resources.get(`notebook:${NB}`)!.pending).toBe(true);
    const r = await rotateNotebookKey({ ...opts, onKeys: () => {} });
    expect(r).toMatchObject({ rotated: true, newVersion: false, rekeyedNotes: 2 });
    expect(s.server.resources.get(`notebook:${NB}`)!.version).toBe(2);
    expect(s.server.resources.get(`notebook:${NB}`)!.pending).toBe(false);
    expect(s.server.calls.filter((c) => c.endsWith("/rotate"))).toHaveLength(1);
  });
});

describe("owner maintenance", () => {
  it("rotates, re-links and delivers keys in one pass, holding back late accounts", async () => {
    const s = await setup();
    const api = s.server.api(OWNER);
    // Alice holds the v1 key; Bob (account made after the invite) waits; someone left → pending.
    await deliverAwaitingKeys({
      api,
      target: { kind: "notebook", id: NB },
      keys: { version: 1, keys: [s.nbKey] },
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
    });
    s.server.resources.get(`notebook:${NB}`)!.pending = true;
    await api.createShare({
      shareId: "0192f3c4-0000-7000-8000-00000000f003",
      target: { kind: "notebook", id: NB },
      permission: "view",
      expiresAt: null,
    });
    const keyring = new Map<string, number>();
    const relinked: string[] = [];
    const asked: string[] = [];
    const opts = {
      api,
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
      masterKey: s.masterKey,
      notebookIndex: async () => s.index,
      notebookOfNote: async () => NB,
      isAgentMode: () => false,
      whenIndexSent: async () => {},
      onKeys: (t: { kind: string; id: string }, k: { version: number }) =>
        void keyring.set(`${t.kind}:${t.id}`, k.version),
      links: {
        webOrigin: "https://ds.test",
        onRecreated: (_t: unknown, urls: string[]) => void relinked.push(...urls),
      },
    };
    const [r] = await maintainOwnedShares(opts);
    expect(r).toMatchObject({ rotated: true, delivered: [] });
    expect(keyring.get(`notebook:${NB}`)).toBe(2);
    expect(keyring.get(`note:${NOTE1}`)).toBe(2);
    expect(relinked).toHaveLength(1);
    expect(s.server.resources.get(`notebook:${NB}`)!.members.get(BOB)!.wrappedKey).toBeNull();
    // Next run, the owner says yes for Bob: he gets the current (v2) key.
    const [again] = await maintainOwnedShares({
      ...opts,
      confirm: (_t, m) => (asked.push(m.userId), true),
    });
    expect(again).toMatchObject({ rotated: false, delivered: [BOB] });
    expect(asked).toEqual([BOB]);
    expect(s.server.resources.get(`notebook:${NB}`)!.version).toBe(2);
  });
});

describe("guest links after rotation", () => {
  it("re-creates the links of the resource with the new key", async () => {
    const s = await setup();
    const api = s.server.api(OWNER);
    const old = await api.createShare({
      shareId: "0192f3c4-0000-7000-8000-00000000f001",
      target: { kind: "notebook", id: NB },
      permission: "view",
      expiresAt: null,
    });
    await api.createShare({
      shareId: "0192f3c4-0000-7000-8000-00000000f002",
      target: { kind: "note", id: NOTE2 },
      permission: "edit",
      expiresAt: null,
    });
    const key = generateKey();
    const links = await recreateShareLinks({
      api,
      target: { kind: "notebook", id: NB },
      key,
      webOrigin: "https://ds.test",
    });
    expect(links).toHaveLength(1);
    expect(links[0]!.oldId).toBe(old.id);
    expect(s.server.shares.has(old.id)).toBe(false);
    expect(links[0]!.share.permission).toBe("view");
    expect(parseShareLink(links[0]!.url)).toMatchObject({ shareId: links[0]!.share.id, key });
    expect(s.server.shares.size).toBe(2);
  });
});

describe("rotation from a second owner device", () => {
  it("does not rotate twice when the server reports pendingSinceVersion", async () => {
    const s = await setup();
    const api = s.server.api(OWNER);
    await api.removeMember({ kind: "notebook", id: NB }, BOB);
    const empty = new Y.Doc(); // no notes: the NoteMeta heuristic cannot tell
    const opts = {
      api,
      notebookId: NB,
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
      masterKey: s.masterKey,
      index: empty,
      agentMode: false,
      whenIndexSent: async () => {},
    };
    // Device A: step 1, then it dies before rotate/done.
    await expect(
      rotateNotebookKey({
        ...opts,
        onKeys: () => {
          throw new Error("crash");
        },
      }),
    ).rejects.toThrow("crash");
    // Device B picks it up without a second version.
    const r = await rotateNotebookKey({ ...opts, onKeys: () => {} });
    expect(r).toMatchObject({ rotated: true, newVersion: false });
    expect(s.server.resources.get(`notebook:${NB}`)!.version).toBe(2);
    expect(s.server.resources.get(`notebook:${NB}`)!.pending).toBe(false);
  });
});

describe("shared note rotation", () => {
  it("rotates a note shared on its own and repairs a NoteMeta left behind", async () => {
    const s = await setup();
    const noteKey = s.noteKeys.get(NOTE1)!;
    s.server.resources.set(`note:${NOTE1}`, {
      kind: "note",
      id: NOTE1,
      version: 1,
      ownerWrappedKey: getNoteMeta(s.index, NOTE1)!.wrappedKey,
      keyChain: [],
      pending: true,
      members: new Map([[ALICE, { role: "viewer", wrappedKey: null }]]),
    });
    const ownerApi = s.server.api(OWNER);
    const stale = Y.encodeStateAsUpdate(s.index);
    const keys = await rotateSharedNoteKey({
      api: ownerApi,
      noteId: NOTE1,
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
      index: s.index,
      notebookKeys: [s.nbKey],
      onKeys: () => {},
    });
    expect(keys.version).toBe(2);
    expect(keys.keys[1]).toEqual(noteKey);
    expect(s.server.resources.get(`note:${NOTE1}`)!.pending).toBe(false);

    // A device whose index missed the NoteMeta write repairs it from the server.
    const other = new Y.Doc();
    Y.applyUpdate(other, stale);
    expect(
      await repairSharedNoteMeta({
        api: ownerApi,
        noteId: NOTE1,
        index: other,
        notebookKey: s.nbKey,
      }),
    ).toBe(true);
    expect(noteKeysFromMeta(getNoteMeta(other, NOTE1)!, [s.nbKey]).keys).toEqual(keys.keys);
    expect(
      await repairSharedNoteMeta({
        api: ownerApi,
        noteId: NOTE1,
        index: other,
        notebookKey: s.nbKey,
      }),
    ).toBe(false);
  });
});

describe("http client", () => {
  it("classifies failures into ApiRequestError", async () => {
    const api = (status: number | null, body: unknown) =>
      createSharingApi(
        createHttpClient({
          baseUrl: "https://ds.test/",
          accessToken: () => "t",
          fetch: (async () => {
            if (status === null) throw new TypeError("offline");
            return new Response(JSON.stringify(body), { status });
          }) as typeof fetch,
        }),
      );
    const revoked = { error: { code: "device_revoked", message: "", reason: "token_reuse" } };
    await expect(api(401, revoked).sharedWithMe()).rejects.toMatchObject({
      failure: { kind: "device_revoked", reason: "token_reuse" },
    });
    await expect(api(null, null).sharedWithMe()).rejects.toMatchObject({
      failure: { kind: "network" },
    });
    await expect(api(200, [{ nope: 1 }]).sharedWithMe()).rejects.toBeInstanceOf(ApiRequestError);
    expect(
      await api(404, { error: { code: "not_found", message: "" } }).getPublicKey(ALICE),
    ).toBeNull();
  });
});

describe("shared placement", () => {
  it("puts new shared resources on top and removes gone ones (D-63)", () => {
    const account = new Y.Doc();
    const SPACE = "0192f3c4-0000-7000-8000-00000000d001";
    const item = (id: string): SharedItem => ({
      target: { kind: "notebook", id },
      owner: { userId: OWNER, email: "o@x.co", publicKey: toBase64Url(new Uint8Array(32)) },
      role: "editor",
      keyVersion: 1,
      wrappedKey: null,
      keyChain: [],
      docIds: [id],
      addedAt: T,
    });
    expect(reconcileSharedRefs(account, [item(NB), item(NOTE1)], SPACE).added).toHaveLength(2);
    // D-63: every new one goes on top (order = smallest − 1), whatever space it arrived in.
    expect(getSharedRefs(account).map((r) => [r.id, r.order])).toEqual([
      [NOTE1, -2],
      [NB, -1],
    ]);
    const OTHER_SPACE = "0192f3c4-0000-7000-8000-00000000d002";
    reconcileSharedRefs(account, [item(NB), item(NOTE1), item(NOTE2)], OTHER_SPACE);
    expect(getSharedRefs(account).map((r) => r.id)).toEqual([NOTE2, NOTE1, NB]);
    const r = reconcileSharedRefs(account, [item(NOTE1), item(NOTE2)], SPACE);
    expect(r).toEqual({ added: [], removed: [{ kind: "notebook", id: NB }] });
    // Equal order (two devices added at once): the newer addedAt comes first.
    putSharedRef(account, {
      kind: "note",
      id: NB,
      spaceId: SPACE,
      order: -10,
      addedAt: "2026-11-08T10:00:00.000Z",
    });
    putSharedRef(account, {
      kind: "note",
      id: NOTE1,
      spaceId: SPACE,
      order: -10,
      addedAt: "2026-11-08T11:00:00.000Z",
    });
    expect(
      getSharedRefs(account)
        .slice(0, 2)
        .map((r) => [r.kind, r.id]),
    ).toEqual([
      ["note", NOTE1],
      ["note", NB],
    ]);
  });
});

describe("sync client and sharing", () => {
  const DOC = "0192f3c4-0000-7000-8000-00000000e001";
  async function until(cond: () => boolean, ms = 20_000) {
    const start = Date.now();
    while (!cond()) {
      if (Date.now() - start > ms) throw new Error("timeout");
      await new Promise((r) => setTimeout(r, 5));
    }
  }
  function client(
    hub: MemorySyncHub,
    deviceId: string,
    extra: Partial<ConstructorParameters<typeof SyncClient>[0]>,
  ) {
    return new SyncClient({
      url: "ws://hub",
      auth: () => ({ kind: "user", accessToken: "t" }),
      deviceId,
      client: { platform: "web", version: "test" },
      storage: new MemorySyncStorage(),
      keyFor: () => generateKey(),
      createSocket: hub.socketFactory(),
      backoff: { initialMs: 5, maxMs: 20 },
      batchMs: 1,
      ...extra,
    });
  }

  it("passes the server-stamped author, keeps viewers silent and pauses on a stale key", async () => {
    const hub = new MemorySyncHub();
    let writerKey = generateKey();
    const readerKeys = [writerKey];
    const writer = client(hub, "dev-w", { keyFor: () => writerKey });
    let stalePaused = 0;
    const reader = client(hub, "dev-r", {
      keyFor: () => readerKeys[0]!,
      alternateKeysFor: () => readerKeys.slice(1),
      readOnly: () => true,
      keyMaybeStale: () => (stalePaused++, true),
    });
    const authors: unknown[] = [];
    reader.on("remoteUpdate", (_d, _u, info) => authors.push(info.author));
    const dw = new Y.Doc();
    const dr = new Y.Doc();
    await writer.addDoc(DOC, dw);
    await reader.addDoc(DOC, dr);
    writer.start();
    reader.start();
    await until(() => writer.isSynced(DOC) && reader.isSynced(DOC));
    dw.getText("t").insert(0, "a");
    await until(() => dr.getText("t").toString() === "a");
    expect(authors[0]).toEqual({ kind: "user", userId: "00000000-0000-7000-8000-000000000000" });

    // The viewer's local edits are never sent.
    dr.getText("t").insert(0, "x");
    await reader.flush();
    await new Promise((r) => setTimeout(r, 30));
    expect(dw.getText("t").toString()).toBe("a");

    // Rotation: the writer moves to a new key first; the reader pauses instead of skipping.
    writerKey = generateKey();
    dw.getText("t").insert(1, "b");
    await until(() => reader.isPaused(DOC));
    expect(stalePaused).toBe(1);
    expect(reader.getSkipped(DOC)).toHaveLength(0);
    readerKeys.unshift(writerKey);
    await reader.keyAvailable(DOC);
    await until(() => dr.getText("t").toString().includes("ab"));
    await writer.stop();
    await reader.stop();
  });
});

describe("shared spaces (D-62)", () => {
  const SPACE = "0192f3c4-0000-7000-8000-00000000d101";
  const NB_A = "0192f3c4-0000-7000-8000-00000000d102";

  it("keeps the space document and the switcher placement", async () => {
    const {
      createSpaceDoc,
      getSpaceMeta,
      setSpaceMeta,
      putSpaceNotebookRef,
      getSpaceNotebookRefs,
    } = await import("../src/index.js");
    const doc = createSpaceDoc(SPACE, { name: "Команда", icon: "🚀" });
    setSpaceMeta(doc, { color: "blue" });
    expect(getSpaceMeta(doc)).toEqual({
      formatVersion: 1,
      spaceId: SPACE,
      name: "Команда",
      icon: "🚀",
      color: "blue",
    });
    putSpaceNotebookRef(doc, {
      id: NB_A,
      name: "Планы",
      icon: null,
      color: null,
      order: 1,
      mode: "private",
      createdAt: T,
    });
    expect(getSpaceNotebookRefs(doc).map((r) => r.id)).toEqual([NB_A]);

    const { reconcileSharedSpaces, getSharedSpaceRefs } = await import("../src/index.js");
    const account = new Y.Doc();
    const item = (kind: "space" | "notebook", id: string) => ({
      target: { kind, id },
      owner: { userId: OWNER, email: "o@x.co", publicKey: toBase64Url(new Uint8Array(32)) },
      role: "editor" as const,
      keyVersion: 1,
      wrappedKey: null,
      keyChain: [],
      docIds: [id],
      addedAt: T,
    });
    expect(
      reconcileSharedSpaces(account, [item("space", SPACE), item("notebook", NB)], ALICE).added,
    ).toEqual([SPACE]);
    expect(getSharedSpaceRefs(account).map((r) => r.spaceId)).toEqual([SPACE]);
    expect(reconcileSharedSpaces(account, [item("notebook", NB)], ALICE).removed).toEqual([SPACE]);
    // Not one's own space, nor a space of this account under another owner's name.
    expect(reconcileSharedSpaces(account, [item("space", SPACE)], OWNER).added).toEqual([]);
    account.getMap("spaces").set(SPACE, new Y.Map());
    expect(reconcileSharedSpaces(account, [item("space", SPACE)], ALICE).added).toEqual([]);
  });

  it("opens space notebooks with the member's spaceKey and delivers it to accepted members", async () => {
    const c = await import("../src/index.js");
    const s = await setup();
    const spaceKey = generateKey();
    const nbKey = generateKey();
    const entry = {
      notebookId: NB_A,
      version: 1,
      spaceWrappedKey: c.wrapNotebookKeyForSpace(spaceKey, nbKey, SPACE, NB_A, 1),
      keyChain: [],
      mode: "private" as const,
    };
    expect(c.spaceNotebookKeys(entry, [generateKey(), spaceKey], SPACE).keys[0]).toEqual(nbKey);
    expect(() => c.spaceNotebookKeys(entry, [generateKey()], SPACE)).toThrow();

    // Owner side: the server lists the space in shared-by-me; Alice accepted, Bob is late.
    const server = s.server as unknown as {
      resources: Map<string, unknown>;
    };
    server.resources.set(`space:${SPACE}`, {
      kind: "space",
      id: SPACE,
      version: 1,
      ownerWrappedKey: c.wrapSpaceKey(s.masterKey, spaceKey, SPACE, 1),
      keyChain: [],
      pending: false,
      members: new Map([
        [ALICE, { role: "editor", wrappedKey: null }],
        [BOB, { role: "viewer", wrappedKey: null, late: true }],
      ]),
    });
    s.server.resources.delete(`notebook:${NB}`);
    const r = await c.maintainOwnedSpaces({
      api: s.server.api(OWNER),
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
      masterKey: s.masterKey,
    });
    expect(r).toEqual([{ target: { kind: "space", id: SPACE }, delivered: [ALICE] }]);
    const items = await s.server.api(ALICE).sharedWithMeAll();
    const mine = c.sharedItemKeys(items[0]!, { userId: ALICE, secretKey: s.alice.secretKey })!;
    expect(mine.keys[0]).toEqual(spaceKey);
    // The D-54 lists leave spaces out.
    expect(await s.server.api(ALICE).sharedWithMe()).toEqual([]);
  });
});

describe("shared space rotation and moves (D-62)", () => {
  const SPACE = "0192f3c4-0000-7000-8000-00000000d201";
  const NB_A = "0192f3c4-0000-7000-8000-00000000d202";
  const NB_B = "0192f3c4-0000-7000-8000-00000000d203";
  const NOTE_A = "0192f3c4-0000-7000-8000-00000000d204";

  async function spaceSetup() {
    const c = await import("../src/index.js");
    const s = await setup();
    const spaceKey = generateKey();
    const indexes = new Map<string, Y.Doc>();
    const notebooks = new Map<string, SpaceNotebook>();
    for (const nb of [NB_A, NB_B]) {
      const nbKey = generateKey();
      const index = new Y.Doc();
      if (nb === NB_A)
        putNoteMeta(index, meta(NOTE_A, wrapKey(nbKey, generateKey(), AD.noteKey(NOTE_A))));
      indexes.set(nb, index);
      notebooks.set(nb, {
        notebookId: nb,
        version: 1,
        spaceWrappedKey: c.wrapNotebookKeyForSpace(spaceKey, nbKey, SPACE, nb, 1),
        keyChain: [],
        mode: nb === NB_B ? "agent" : "private",
      });
    }
    // Alice holds the space key, Bob held it and left: rotation pending since v1.
    s.server.resources.set(`space:${SPACE}`, {
      kind: "space",
      id: SPACE,
      version: 1,
      ownerWrappedKey: c.wrapSpaceKey(s.masterKey, spaceKey, SPACE, 1),
      keyChain: [],
      pending: true,
      pendingSince: 1,
      members: new Map([[ALICE, { role: "editor", wrappedKey: "set below" }]]),
      notebooks,
    });
    await deliverNow(s, c, spaceKey);
    return { c, s, spaceKey, indexes };
  }

  async function deliverNow(
    s: Awaited<ReturnType<typeof setup>>,
    c: typeof SharedIndex,
    spaceKey: Uint8Array,
  ) {
    const r = s.server.resources.get(`space:${SPACE}`)!;
    r.members.get(ALICE)!.wrappedKey = c.wrapKeyForMember(
      spaceKey,
      s.owner.secretKey,
      s.alice.publicKey,
      {
        kind: "space",
        targetId: SPACE,
        version: 1,
        fromUserId: OWNER,
        toUserId: ALICE,
      },
    );
  }

  it("rotates the space key with all its notebooks, re-keys notes and resumes without a second version", async () => {
    const { c, s, spaceKey, indexes } = await spaceSetup();
    const api = s.server.api(OWNER);
    const opts = {
      api,
      spaceId: SPACE,
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
      masterKey: s.masterKey,
      notebookIndex: async (id: string) => indexes.get(id)!,
      whenIndexSent: async () => {},
    };
    // Device A dies right after step 1.
    await expect(
      c.rotateSpaceKey({
        ...opts,
        onKeys: () => {
          throw new Error("crash");
        },
      }),
    ).rejects.toThrow("crash");
    const r0 = s.server.resources.get(`space:${SPACE}`)!;
    expect(r0.version).toBe(2);
    expect(r0.pending).toBe(true);
    // Device B finishes it.
    const seen: string[] = [];
    const r = await c.rotateSpaceKey({
      ...opts,
      onKeys: (k) => void seen.push(k.space ? "space" : `notes:${k.notes!.size}`),
    });
    expect(r).toMatchObject({ rotated: true, newVersion: false, rekeyedNotes: 1 });
    expect(seen).toEqual(["notes:1"]);
    expect(s.server.calls.filter((x) => x.endsWith("/rotate"))).toHaveLength(1);
    expect(r0.pending).toBe(false);

    // Alice opens the new space key, then every notebook (v2) with the old one in its chain.
    const item = (await s.server.api(ALICE).sharedWithMeAll()).find(
      (i) => i.target.kind === "space",
    )!;
    const sk = c.sharedItemKeys(item, { userId: ALICE, secretKey: s.alice.secretKey })!;
    expect(sk.version).toBe(2);
    expect(sk.keys[1]).toEqual(spaceKey);
    for (const e of await api.listSpaceNotebooks(SPACE)) {
      const nk = c.spaceNotebookKeys(e, sk.keys, SPACE);
      expect(nk.version).toBe(2);
      expect(nk.keys).toHaveLength(2);
    }
    const noteMeta = getNoteMeta(indexes.get(NB_A)!, NOTE_A)!;
    expect(noteMeta.keyVersion).toBe(2);
  });

  it("moves a personal notebook into the space and back out", async () => {
    const { c, s } = await spaceSetup();
    s.server.resources.get(`space:${SPACE}`)!.pending = false;
    const api = s.server.api(OWNER);
    const account = new Y.Doc();
    const spaceDoc = c.createSpaceDoc(SPACE, { name: "Команда" });
    c.putNotebookRef(account, {
      id: NB,
      spaceId: "0192f3c4-0000-7000-8000-00000000d299",
      name: "Личный",
      icon: null,
      color: null,
      order: 1,
      mode: "private",
      createdAt: T,
    });
    const moved = await c.moveNotebookIntoSpace({
      api,
      spaceId: SPACE,
      notebookId: NB,
      masterKey: s.masterKey,
      account,
      spaceDoc,
    });
    expect(moved.keys[0]).toEqual(s.nbKey);
    expect(c.getNotebookRef(account, NB)).toBeNull();
    expect(c.getSpaceNotebookRef(spaceDoc, NB)?.name).toBe("Личный");
    // Members open it with the space key.
    const sk = c.ownerSpaceKeys(await api.getSpaceKey(SPACE), s.masterKey, SPACE);
    const entry = (await api.listSpaceNotebooks(SPACE)).find((e) => e.notebookId === NB)!;
    expect(c.spaceNotebookKeys(entry, sk.keys, SPACE).keys[0]).toEqual(s.nbKey);

    // Back out: a new key under the master key; steps 2–3 resume through rotateNotebookKey.
    const PERSONAL = "0192f3c4-0000-7000-8000-00000000d298";
    const out = await c.moveNotebookOutOfSpace({
      api,
      spaceId: SPACE,
      notebookId: NB,
      masterKey: s.masterKey,
      account,
      spaceDoc,
      toSpaceId: PERSONAL,
      onKeys: () => {},
    });
    expect(out.version).toBe(2);
    expect(c.getNotebookRef(account, NB)?.spaceId).toBe(PERSONAL);
    expect(c.getSpaceNotebookRef(spaceDoc, NB)).toBeNull();
    const rest = await rotateNotebookKey({
      api,
      notebookId: NB,
      owner: { userId: OWNER, secretKey: s.owner.secretKey },
      masterKey: s.masterKey,
      index: s.index,
      agentMode: false,
      onKeys: () => {},
      whenIndexSent: async () => {},
    });
    expect(rest).toMatchObject({ rotated: true, newVersion: false, rekeyedNotes: 2 });
    expect(s.server.resources.get(`notebook:${NB}`)!.pending).toBe(false);
  });
});
