import * as Y from "yjs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  AD,
  ApiRequestError,
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
  reconcileSharedRefs,
  repairSharedNoteMeta,
  parseShareLink,
  recreateShareLinks,
  rotateNotebookKey,
  rotateSharedNoteKey,
  sharedItemKeys,
  toBase64Url,
  wrapKey,
  type BoxKeyPair,
  type Member,
  type NoteMeta,
  type SharedItem,
  type Share,
  type SharingApi,
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
  kind: "notebook" | "note";
  id: string;
  version: number;
  ownerWrappedKey: string;
  keyChain: string[];
  pending: boolean;
  members: Map<string, { role: "editor" | "viewer"; wrappedKey: string | null; late?: boolean }>;
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
    if ((m = p.match(/^\/notebooks\/([^/]+)\/key$/))) {
      const r = this.resources.get(`notebook:${m[1]}`)!;
      return this.res(200, {
        wrappedKey: r.ownerWrappedKey,
        version: r.version,
        keyChain: r.keyChain,
        keyRotationPending: r.pending,
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
    if (p === "/shared-with-me") {
      const items: SharedItem[] = [];
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
    if ((m = p.match(/^\/members\/(notebook|note)\/([^/]+)(?:\/(.*))?$/))) {
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
        if (ids.size !== r.members.size || [...r.members.keys()].some((u) => !ids.has(u)))
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
  it("adds new shared resources to the current space and removes gone ones", () => {
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
    expect(getSharedRefs(account, SPACE).map((r) => r.id)).toEqual([NB, NOTE1]);
    const r = reconcileSharedRefs(account, [item(NOTE1)], SPACE);
    expect(r).toEqual({ added: [], removed: [{ kind: "notebook", id: NB }] });
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
