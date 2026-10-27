import { WebSocket, WebSocketServer } from "ws";
import * as Y from "yjs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  MemorySyncHub,
  MemorySyncStorage,
  SyncClient,
  generateKey,
  initCrypto,
  KeyUnavailableError,
  uuidv7,
  encryptDocUpdate,
  toBase64Url,
  type SkippedUpdate,
  type SyncClientError,
  type SyncClientOptions,
  type SyncStatus,
  type WebSocketLike,
  SYNC_CLOSE_DEVICE_REVOKED,
} from "../src/index.js";

const DOC = "0192f3c4-0000-7000-8000-0000000000d1";
let key: Uint8Array;
const clients: SyncClient[] = [];

beforeAll(async () => {
  await initCrypto();
  key = generateKey();
});

afterEach(async () => {
  await Promise.all(clients.splice(0).map((c) => c.stop()));
});

function makeClient(hub: MemorySyncHub, deviceId: string, extra: Partial<SyncClientOptions> = {}) {
  const storage = (extra.storage as MemorySyncStorage | undefined) ?? new MemorySyncStorage();
  const client = new SyncClient({
    url: "ws://hub",
    auth: () => ({ kind: "user", accessToken: "token" }),
    deviceId,
    client: { platform: "web", version: "test" },
    storage,
    keyFor: () => key,
    createSocket: hub.socketFactory(),
    backoff: { initialMs: 5, maxMs: 20 },
    batchMs: 1,
    random: () => 0.5,
    ...extra,
  });
  clients.push(client);
  return { client, storage };
}

// Generous deadline: the suite runs in parallel with other packages in CI.
async function until(cond: () => boolean | Promise<boolean>, ms = 20_000): Promise<void> {
  const start = Date.now();
  while (!(await cond())) {
    if (Date.now() - start > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 5));
  }
}

const text = (doc: Y.Doc) => doc.getText("t").toString();

describe("sync client", () => {
  it("syncs two devices in real time and encrypts on the wire", async () => {
    const hub = new MemorySyncHub();
    const a = makeClient(hub, "dev-a");
    const b = makeClient(hub, "dev-b");
    const da = new Y.Doc();
    const db = new Y.Doc();
    await a.client.addDoc(DOC, da);
    await b.client.addDoc(DOC, db);
    a.client.start();
    b.client.start();
    await until(() => a.client.isSynced(DOC) && b.client.isSynced(DOC));
    da.getText("t").insert(0, "hello");
    await until(() => text(db) === "hello");
    db.getText("t").insert(5, " world");
    await until(() => text(da) === "hello world");
    const stored = hub.docs
      .get(DOC)!
      .items.map((i) => i.payload)
      .join("");
    expect(stored).not.toContain("hello");
    await until(async () => (await a.storage.listOutbox()).length === 0);
    await a.client.flush(); // cursors are persisted in batches
    expect((await a.storage.getDocState(DOC))!.lastSeq).toBe(2);
  });

  it("queues offline edits and delivers them after reconnect", async () => {
    const hub = new MemorySyncHub();
    const a = makeClient(hub, "dev-a");
    const da = new Y.Doc();
    await a.client.addDoc(DOC, da);
    da.getText("t").insert(0, "offline");
    await a.client.flush();
    expect(await a.storage.listOutbox()).toHaveLength(1);
    a.client.start();
    await until(async () => (await a.storage.listOutbox()).length === 0);

    const b = makeClient(hub, "dev-b");
    const db = new Y.Doc();
    await b.client.addDoc(DOC, db);
    b.client.start();
    await until(() => text(db) === "offline");

    // Network loss: both reconnect on their own; edits made meanwhile arrive.
    const statuses: SyncStatus[] = [];
    a.client.on("status", (s) => statuses.push(s));
    hub.dropAll();
    da.getText("t").insert(0, ">");
    await until(() => text(db) === ">offline");
    expect(statuses).toContain("offline");
    expect(statuses.at(-1)).toBe("online");
  });

  it("holds queued pushes of a document until it is subscribed", async () => {
    const hub = new MemorySyncHub();
    const storage = new MemorySyncStorage();
    const first = makeClient(hub, "dev-a", { storage });
    const d1 = new Y.Doc();
    await first.client.addDoc(DOC, d1);
    d1.getText("t").insert(0, "queued");
    await first.client.stop();
    expect(await storage.listOutbox()).toHaveLength(1);

    const again = makeClient(hub, "dev-a", { storage });
    again.client.start();
    await until(() => again.client.status === "online");
    await new Promise((r) => setTimeout(r, 30));
    expect(hub.docs.get(DOC)?.items.length ?? 0).toBe(0);
    await again.client.addDoc(DOC, d1);
    await until(() => hub.docs.get(DOC)?.items.length === 1);
    await until(async () => (await storage.listOutbox()).length === 0);
  });

  it("catches up from lastSeq after restart with persisted storage", async () => {
    const hub = new MemorySyncHub({ catchUpChunk: 2 });
    const a = makeClient(hub, "dev-a");
    const da = new Y.Doc();
    await a.client.addDoc(DOC, da);
    a.client.start();
    for (let i = 0; i < 5; i++) {
      da.getText("t").insert(i, String(i));
      await a.client.flush();
    }
    await until(async () => (await a.storage.listOutbox()).length === 0);

    const b = makeClient(hub, "dev-b");
    const db = new Y.Doc();
    await b.client.addDoc(DOC, db);
    b.client.start();
    await until(() => b.client.isSynced(DOC));
    expect(text(db)).toBe("01234");
    await b.client.stop();

    da.getText("t").insert(5, "5");
    await a.client.flush();
    await until(() => hub.docs.get(DOC)!.seq === 6);

    // Same storage, fresh doc restored from local state: only seq 6 is fetched.
    const restored = new Y.Doc();
    Y.applyUpdate(restored, Y.encodeStateAsUpdate(db));
    const b2 = makeClient(hub, "dev-b", { storage: b.storage });
    let remote = 0;
    b2.client.on("remoteUpdate", () => remote++);
    await b2.client.addDoc(DOC, restored);
    b2.client.start();
    await until(() => text(restored) === "012345");
    expect(remote).toBe(1);
  });

  it("uploads a snapshot past the threshold; new devices start from it", async () => {
    const hub = new MemorySyncHub();
    const a = makeClient(hub, "dev-a", { snapshotThresholds: { updates: 3 } });
    const da = new Y.Doc();
    let hooked = 0;
    await a.client.addDoc(DOC, da);
    a.client.start();
    await until(() => a.client.isSynced(DOC));
    for (let i = 0; i < 5; i++) {
      da.getText("t").insert(0, "x");
      await a.client.flush();
      await until(async () => (await a.storage.listOutbox()).length === 0);
    }
    await until(() => hub.docs.get(DOC)!.snapshot !== null);
    expect(hub.docs.get(DOC)!.items.length).toBeLessThan(5);
    await a.client.flush();
    expect((await a.storage.getDocState(DOC))!.updatesSinceSnapshot).toBeLessThanOrEqual(1);

    const b = makeClient(hub, "dev-b", { beforeSnapshot: () => hooked++ });
    const db = new Y.Doc();
    await b.client.addDoc(DOC, db);
    b.client.start();
    await until(() => b.client.isSynced(DOC));
    expect(text(db)).toBe("xxxxx");
    expect(hooked).toBe(0);
  });

  it("sends oversized updates as a snapshot", async () => {
    const hub = new MemorySyncHub();
    const a = makeClient(hub, "dev-a");
    const da = new Y.Doc();
    await a.client.addDoc(DOC, da);
    a.client.start();
    await until(() => a.client.isSynced(DOC));
    const big = "y".repeat(3 * 1024 * 1024);
    da.getText("t").insert(0, big);
    await until(() => hub.docs.get(DOC)!.snapshot !== null);
    expect(hub.docs.get(DOC)!.items).toHaveLength(0);
  });

  it("drops forbidden pushes for view-only guests", async () => {
    const hub = new MemorySyncHub({
      authenticate: () => ({ userId: null, canRead: () => true, canWrite: () => false }),
    });
    const errors: SyncClientError[] = [];
    const g = makeClient(hub, "guest", {
      auth: () => ({ kind: "guest", shareId: DOC, guestToken: "g" }),
    });
    g.client.on("error", (e) => errors.push(e));
    const dg = new Y.Doc();
    await g.client.addDoc(DOC, dg);
    g.client.start();
    dg.getText("t").insert(0, "nope");
    await until(() => errors.some((e) => e.code === "forbidden"));
    await until(async () => (await g.storage.listOutbox()).length === 0);
  });

  it("reports a revoked device once and stops without sending the outbox", async () => {
    const hub = new MemorySyncHub();
    const a = makeClient(hub, "dev-a");
    const reasons: string[] = [];
    const errors: SyncClientError[] = [];
    a.client.on("deviceRevoked", (r) => reasons.push(r));
    a.client.on("error", (e) => errors.push(e));
    const da = new Y.Doc();
    await a.client.addDoc(DOC, da);
    a.client.start();
    await until(() => a.client.isSynced(DOC));
    hub.revokeDevice("dev-a", "password_changed");
    await until(() => a.client.status === "revoked");
    da.getText("t").insert(0, "unsent");
    a.client.reconnect();
    a.client.start();
    await new Promise((r) => setTimeout(r, 50));
    expect(reasons).toEqual(["password_changed"]);
    expect(errors.some((e) => (e.code as string) === "device_revoked")).toBe(false);
    expect(hub.connectionCount).toBe(0);
    expect(hub.docs.get(DOC)!.items).toHaveLength(0);
  });

  it("treats a revoked hello like a revocation, not an auth failure", async () => {
    const hub = new MemorySyncHub();
    hub.revokeDevice("dev-a", "refresh_reuse");
    const a = makeClient(hub, "dev-a");
    const reasons: string[] = [];
    a.client.on("deviceRevoked", (r) => reasons.push(r));
    a.client.start();
    await until(() => a.client.status === "revoked");
    expect(reasons).toEqual(["refresh_reuse"]);
  });

  it("never reports a revocation for auth failures or network loss", async () => {
    let accept = true;
    const hub = new MemorySyncHub({
      authenticate: () =>
        accept ? { userId: null, canRead: () => true, canWrite: () => true } : null,
    });
    const a = makeClient(hub, "dev-a", { maxAuthFailures: 2 });
    const reasons: string[] = [];
    a.client.on("deviceRevoked", (r) => reasons.push(r));
    await a.client.addDoc(DOC, new Y.Doc());
    a.client.start();
    await until(() => a.client.isSynced(DOC));
    hub.dropAll();
    await until(() => a.client.isSynced(DOC));
    accept = false;
    hub.dropAll();
    await until(() => a.client.status === "unauthorized");
    expect(reasons).toEqual([]);
  });

  it("treats close code 4401 alone as a revocation", async () => {
    const hub = new MemorySyncHub();
    const factory = hub.socketFactory();
    let last: ReturnType<typeof factory> | null = null;
    const a = makeClient(hub, "dev-a", {
      createSocket: (url) => (last = factory(url)),
    });
    const reasons: string[] = [];
    a.client.on("deviceRevoked", (r) => reasons.push(r));
    a.client.start();
    await until(() => a.client.status === "online");
    last!.onclose?.({ code: SYNC_CLOSE_DEVICE_REVOKED, reason: "bogus" });
    expect(a.client.status).toBe("revoked");
    expect(reasons).toEqual(["user"]);
  });

  it("gives up after repeated auth failures", async () => {
    const hub = new MemorySyncHub({ authenticate: () => null });
    const a = makeClient(hub, "dev-a", { maxAuthFailures: 2 });
    a.client.start();
    await until(() => a.client.status === "unauthorized");
  });

  it("reports undecryptable updates", async () => {
    const hub = new MemorySyncHub();
    const a = makeClient(hub, "dev-a");
    const b = makeClient(hub, "dev-b", { keyFor: () => generateKey() });
    const errors: SyncClientError[] = [];
    b.client.on("error", (e) => errors.push(e));
    const da = new Y.Doc();
    await a.client.addDoc(DOC, da);
    await b.client.addDoc(DOC, new Y.Doc());
    a.client.start();
    b.client.start();
    await until(() => b.client.isSynced(DOC));
    da.getText("t").insert(0, "secret");
    await until(() => errors.some((e) => e.code === "decrypt_failed"));
  });

  it("relays encrypted awareness", async () => {
    const hub = new MemorySyncHub();
    const a = makeClient(hub, "dev-a");
    const b = makeClient(hub, "dev-b");
    await a.client.addDoc(DOC, new Y.Doc());
    await b.client.addDoc(DOC, new Y.Doc());
    const got: string[] = [];
    b.client.on("awareness", (_d, p, dev) => got.push(`${dev}:${new TextDecoder().decode(p)}`));
    a.client.start();
    b.client.start();
    await until(() => a.client.isSynced(DOC) && b.client.isSynced(DOC));
    await a.client.sendAwareness(DOC, new TextEncoder().encode("cursor"));
    await until(() => got.length === 1);
    expect(got[0]).toBe("dev-a:cursor");
  });

  it("works over a real WebSocket (ws)", async () => {
    const hub = new MemorySyncHub();
    const wss = new WebSocketServer({ port: 0 });
    wss.on("connection", (socket) => {
      const link = hub.connect(
        (raw) => socket.send(raw),
        () => socket.close(),
      );
      socket.on("message", (data) => link.receive(data.toString()));
      socket.on("close", () => link.disconnect());
    });
    await new Promise((r) => wss.once("listening", r));
    const port = (wss.address() as { port: number }).port;
    const factory = (url: string) => new WebSocket(url) as unknown as WebSocketLike;
    const a = makeClient(hub, "dev-a", {
      createSocket: factory,
      url: `ws://127.0.0.1:${port}/v1/sync`,
    });
    const b = makeClient(hub, "dev-b", {
      createSocket: factory,
      url: `ws://127.0.0.1:${port}/v1/sync`,
    });
    const da = new Y.Doc();
    const db = new Y.Doc();
    await a.client.addDoc(DOC, da);
    await b.client.addDoc(DOC, db);
    a.client.start();
    b.client.start();
    await until(() => a.client.isSynced(DOC) && b.client.isSynced(DOC));
    da.getText("t").insert(0, "over ws");
    await until(() => text(db) === "over ws");
    await Promise.all(clients.splice(0).map((c) => c.stop()));
    await new Promise((r) => wss.close(r));
  });
});

describe("sync client extras", () => {
  it("requestSnapshot uploads a snapshot on demand", async () => {
    const hub = new MemorySyncHub();
    const a = makeClient(hub, "dev-a");
    const da = new Y.Doc();
    await a.client.addDoc(DOC, da);
    expect(await a.client.requestSnapshot(DOC)).toBe(false); // not caught up yet
    a.client.start();
    await until(() => a.client.isSynced(DOC));
    da.getText("t").insert(0, "v1");
    expect(await a.client.requestSnapshot(DOC)).toBe(true);
    await until(
      () => hub.docs.get(DOC)?.snapshot !== null && hub.docs.get(DOC)?.snapshot !== undefined,
    );
    await until(async () => (await a.storage.listOutbox()).length === 0);
  });

  it("resubscribe after registering an offline-created document", async () => {
    const hub = new MemorySyncHub({ autoCreateDocs: false });
    const a = makeClient(hub, "dev-a");
    const errors: SyncClientError[] = [];
    a.client.on("error", (e) => errors.push(e));
    const da = new Y.Doc();
    await a.client.addDoc(DOC, da);
    da.getText("t").insert(0, "offline note");
    da.getText("t").insert(0, ">");
    a.client.start();
    await until(() => errors.some((e) => e.code === "doc_not_found"));
    hub.registerDoc(DOC); // POST /v1/docs succeeded
    await a.client.resubscribe(DOC);
    await until(() => a.client.isSynced(DOC));
    await until(async () => (await a.storage.listOutbox()).length === 0);
    const b = makeClient(hub, "dev-b");
    const db = new Y.Doc();
    await b.client.addDoc(DOC, db);
    b.client.start();
    await until(() => db.getText("t").toString() === ">offline note");
  });
});

describe("stored documents", () => {
  function storedApp() {
    const states = new Map<string, Uint8Array>();
    const seen: string[] = [];
    return {
      states,
      seen,
      handler: {
        onUpdates: async (docId: string, updates: Uint8Array[]) => {
          seen.push(docId);
          // Simulate async storage between reads and writes.
          await new Promise((r) => setTimeout(r, 1));
          const prev = states.get(docId);
          states.set(docId, Y.mergeUpdates(prev ? [prev, ...updates] : updates));
        },
        loadState: (docId: string) => states.get(docId) ?? null,
      },
      textOf(docId: string) {
        const d = new Y.Doc();
        const s = states.get(docId);
        if (s) Y.applyUpdate(d, s);
        return d.getText("t").toString();
      },
    };
  }

  it("keeps remote updates in the app's storage without a Y.Doc", async () => {
    const hub = new MemorySyncHub();
    const writer = makeClient(hub, "dev-w");
    const dw = new Y.Doc();
    await writer.client.addDoc(DOC, dw);
    writer.client.start();
    dw.getText("t").insert(0, "hello");
    await writer.client.flush();

    const app = storedApp();
    const reader = makeClient(hub, "dev-r", { storedDocs: app.handler });
    await reader.client.addStoredDocs([DOC]);
    reader.client.start();
    await until(() => reader.client.isSynced(DOC));
    expect(reader.client.isLive(DOC)).toBe(false);
    expect(app.textOf(DOC)).toBe("hello");
    dw.getText("t").insert(5, " world");
    await until(() => app.textOf(DOC) === "hello world");
  });

  it("switches stored → live → stored without losing concurrent updates", async () => {
    const hub = new MemorySyncHub();
    const writer = makeClient(hub, "dev-w", { batchMs: 0 });
    const dw = new Y.Doc();
    await writer.client.addDoc(DOC, dw);
    writer.client.start();

    const app = storedApp();
    const reader = makeClient(hub, "dev-r", { storedDocs: app.handler });
    await reader.client.addStoredDocs([DOC]);
    reader.client.start();
    await until(() => reader.client.isSynced(DOC));

    // The writer keeps typing while the reader opens and closes the note.
    let typing = true;
    let n = 0;
    const loop = (async () => {
      while (typing) {
        dw.getText("t").insert(dw.getText("t").length, String(n++ % 10));
        await new Promise((r) => setTimeout(r, 1));
      }
    })();
    await new Promise((r) => setTimeout(r, 30));
    const live = await reader.client.openDoc(DOC, async () => {
      const d = new Y.Doc();
      const s = app.handler.loadState(DOC);
      if (s) Y.applyUpdate(d, s);
      return d;
    });
    expect(reader.client.isLive(DOC)).toBe(true);
    await new Promise((r) => setTimeout(r, 30));
    live.getText("t").insert(0, "R:"); // local edit while live
    await new Promise((r) => setTimeout(r, 10));
    await reader.client.closeDoc(DOC, (doc) => {
      app.states.set(DOC, Y.encodeStateAsUpdate(doc));
    });
    await new Promise((r) => setTimeout(r, 30));
    typing = false;
    await loop;
    await writer.client.flush();
    await reader.client.flush();
    const expected = () => {
      return dw.getText("t").toString();
    };
    await until(() => expected().startsWith("R:") && app.textOf(DOC) === expected());
    expect(app.textOf(DOC).length).toBeGreaterThan(5);
  });

  it("ignores awareness of stored documents", async () => {
    const hub = new MemorySyncHub();
    const a = makeClient(hub, "dev-a");
    const app = storedApp();
    const b = makeClient(hub, "dev-b", { storedDocs: app.handler });
    await a.client.addDoc(DOC, new Y.Doc());
    await b.client.addStoredDocs([DOC]);
    const got: string[] = [];
    b.client.on("awareness", () => got.push("x"));
    a.client.start();
    b.client.start();
    await until(() => a.client.isSynced(DOC) && b.client.isSynced(DOC));
    await a.client.sendAwareness(DOC, new Uint8Array([1]));
    await b.client.sendAwareness(DOC, new Uint8Array([2])); // dropped: not live
    await new Promise((r) => setTimeout(r, 30));
    expect(got).toEqual([]);
  });

  it("uploads compaction snapshots from the stored state", async () => {
    const hub = new MemorySyncHub();
    const writer = makeClient(hub, "dev-w");
    const dw = new Y.Doc();
    await writer.client.addDoc(DOC, dw);
    writer.client.start();
    const app = storedApp();
    const reader = makeClient(hub, "dev-r", {
      storedDocs: app.handler,
      snapshotThresholds: { updates: 3 },
    });
    await reader.client.addStoredDocs([DOC]);
    reader.client.start();
    await until(() => reader.client.isSynced(DOC));
    for (let i = 0; i < 6; i++) {
      dw.getText("t").insert(0, "x");
      await writer.client.flush();
    }
    await until(() => app.textOf(DOC) === "xxxxxx");
    await until(() => hub.docs.get(DOC)!.snapshot !== null);
    const fresh = makeClient(hub, "dev-f");
    const df = new Y.Doc();
    await fresh.client.addDoc(DOC, df);
    fresh.client.start();
    await until(() => df.getText("t").toString() === "xxxxxx");
  });
});

describe("undecryptable items", () => {
  /** Push an item sealed with `sealKey` straight into the hub (a buggy device). */
  function pushRaw(
    hub: MemorySyncHub,
    sealKey: Uint8Array,
    update: Uint8Array,
    deviceId = "buggy-ios",
  ) {
    const d = hub.docs.get(DOC)!;
    d.items.push({
      seq: ++d.seq,
      payload: toBase64Url(encryptDocUpdate(sealKey, DOC, update)),
      deviceId,
    });
    return d.seq;
  }
  function updateOf(fn: (d: Y.Doc) => void, base?: Y.Doc): Uint8Array {
    const d = new Y.Doc();
    if (base) Y.applyUpdate(d, Y.encodeStateAsUpdate(base));
    const sv = Y.encodeStateVector(d);
    fn(d);
    return Y.encodeStateAsUpdate(d, sv);
  }

  it("skips one bad item, applies the rest and advances the cursor", async () => {
    const hub = new MemorySyncHub();
    hub.registerDoc(DOC);
    const src = new Y.Doc();
    pushRaw(
      hub,
      key,
      updateOf((d) => d.getText("a").insert(0, "one"), src),
    );
    const badSeq = pushRaw(
      hub,
      generateKey(),
      updateOf((d) => d.getText("b").insert(0, "lost")),
    );
    pushRaw(
      hub,
      key,
      updateOf((d) => d.getText("c").insert(0, "three")),
    );
    const r = makeClient(hub, "dev-r");
    const skipped: SkippedUpdate[] = [];
    r.client.on("skipped", (s) => skipped.push(s));
    const dr = new Y.Doc();
    await r.client.addDoc(DOC, dr);
    r.client.start();
    await until(() => r.client.isSynced(DOC));
    expect(dr.getText("a").toString()).toBe("one");
    expect(dr.getText("c").toString()).toBe("three");
    expect(skipped).toEqual([
      expect.objectContaining({
        docId: DOC,
        seq: badSeq,
        deviceId: "buggy-ios",
        kind: "update",
        reason: "decrypt_failed",
      }),
    ]);
    expect(r.client.getSkipped(DOC)).toHaveLength(1);
    await r.client.flush();
    expect((await r.storage.getDocState(DOC))!.lastSeq).toBe(3);
    // Live updates after the bad one keep flowing.
    const w = makeClient(hub, "dev-w");
    const dw = new Y.Doc();
    await w.client.addDoc(DOC, dw);
    w.client.start();
    await until(() => w.client.isSynced(DOC));
    dw.getText("c").insert(0, ">");
    await until(() => dr.getText("c").toString() === ">three");
  });

  it("tries alternate keys before skipping", async () => {
    const hub = new MemorySyncHub();
    hub.registerDoc(DOC);
    const retired = generateKey();
    pushRaw(
      hub,
      retired,
      updateOf((d) => d.getText("t").insert(0, "old key")),
    );
    const r = makeClient(hub, "dev-r", { alternateKeysFor: () => [generateKey(), retired] });
    const dr = new Y.Doc();
    await r.client.addDoc(DOC, dr);
    r.client.start();
    await until(() => r.client.isSynced(DOC));
    expect(dr.getText("t").toString()).toBe("old key");
    expect(r.client.getSkipped()).toEqual([]);
  });

  it("skips corrupt updates of stored documents without touching the saved state", async () => {
    const hub = new MemorySyncHub();
    hub.registerDoc(DOC);
    pushRaw(hub, key, new Uint8Array([1, 2, 3, 4, 5])); // decrypts, but is not a Yjs update
    pushRaw(
      hub,
      key,
      updateOf((d) => d.getText("t").insert(0, "ok")),
    );
    let saved: Uint8Array | null = null;
    const r = makeClient(hub, "dev-r", {
      storedDocs: {
        onUpdates: (_id, ups) => {
          saved = Y.mergeUpdates(saved ? [saved, ...ups] : ups);
        },
        loadState: () => saved,
      },
    });
    await r.client.addStoredDocs([DOC]);
    r.client.start();
    await until(() => r.client.isSynced(DOC));
    const d = new Y.Doc();
    Y.applyUpdate(d, saved!);
    expect(d.getText("t").toString()).toBe("ok");
    expect(r.client.getSkipped(DOC)[0]).toMatchObject({ seq: 1, reason: "apply_failed" });
  });

  it("recovers skipped content from the server's latest snapshot", async () => {
    const hub = new MemorySyncHub();
    hub.registerDoc(DOC);
    const truth = new Y.Doc();
    const good = updateOf((d) => d.getText("t").insert(0, "hello"), truth);
    Y.applyUpdate(truth, good);
    pushRaw(hub, generateKey(), good); // the only copy the reader sees first is unreadable
    const r = makeClient(hub, "dev-r", { recoverSkippedFromSnapshot: true });
    // Meanwhile a healthy device uploads a snapshot covering the bad seq.
    r.client.on("skipped", () => {
      const d = hub.docs.get(DOC)!;
      d.snapshot = {
        seq: d.seq,
        payload: toBase64Url(encryptDocUpdate(key, DOC, Y.encodeStateAsUpdate(truth))),
      };
    });
    const dr = new Y.Doc();
    await r.client.addDoc(DOC, dr);
    r.client.start();
    await until(() => dr.getText("t").toString() === "hello");
    expect(r.client.getSkipped(DOC)).toHaveLength(1);
  });
});

describe("key not available yet", () => {
  function seed(hub: MemorySyncHub, sealKey: Uint8Array, texts: string[]) {
    hub.registerDoc(DOC);
    const d = hub.docs.get(DOC)!;
    const src = new Y.Doc();
    for (const t of texts) {
      const sv = Y.encodeStateVector(src);
      src.getText("t").insert(src.getText("t").length, t);
      const up = Y.encodeStateAsUpdate(src, sv);
      d.items.push({
        seq: ++d.seq,
        payload: toBase64Url(encryptDocUpdate(sealKey, DOC, up)),
        deviceId: "dev-x",
      });
    }
  }

  it("pauses without skipping or advancing, then resumes on keyAvailable", async () => {
    const hub = new MemorySyncHub();
    seed(hub, key, ["a", "b", "c"]);
    let known: Uint8Array | null = null;
    const errors: SyncClientError[] = [];
    const missing: string[] = [];
    const r = makeClient(hub, "dev-r", { keyFor: () => known, missingKeyReportMs: 20 });
    r.client.on("error", (e) => errors.push(e));
    r.client.on("keyMissing", (id) => missing.push(id));
    const dr = new Y.Doc();
    await r.client.addDoc(DOC, dr);
    r.client.start();
    await until(() => r.client.isPaused(DOC));
    await until(() => errors.some((e) => e.code === "key_missing"));
    expect(missing).toEqual([DOC]);
    expect(r.client.getSkipped()).toEqual([]);
    expect(r.client.isSynced(DOC)).toBe(false);
    expect(dr.getText("t").toString()).toBe("");
    await r.client.flush();
    expect((await r.storage.getDocState(DOC))?.lastSeq ?? 0).toBe(0);

    known = key; // e.g. the notebook index with the wrapped noteKey arrived
    await r.client.keyAvailable(DOC);
    await until(() => r.client.isSynced(DOC));
    expect(dr.getText("t").toString()).toBe("abc");
    expect(r.client.isPaused(DOC)).toBe(false);
    expect(r.client.getSkipped()).toEqual([]);
  });

  it("treats a thrown KeyUnavailableError the same way and keeps local edits", async () => {
    const hub = new MemorySyncHub();
    hub.registerDoc(DOC);
    let ready = false;
    const r = makeClient(hub, "dev-r", {
      keyFor: (id) => {
        if (!ready) throw new KeyUnavailableError(id);
        return key;
      },
    });
    const dr = new Y.Doc();
    await r.client.addDoc(DOC, dr);
    r.client.start();
    await until(() => r.client.isSynced(DOC)); // empty doc: nothing to decrypt
    dr.getText("t").insert(0, "local");
    await until(() => r.client.isPaused(DOC));
    expect(await r.storage.listOutbox()).toHaveLength(0);
    ready = true;
    await r.client.keyAvailable(DOC);
    await until(
      async () =>
        hub.docs.get(DOC)!.items.length === 1 && (await r.storage.listOutbox()).length === 0,
    );
    const other = makeClient(hub, "dev-o");
    const d2 = new Y.Doc();
    await other.client.addDoc(DOC, d2);
    other.client.start();
    await until(() => d2.getText("t").toString() === "local");
  });

  it("still skips items that fail with a key, and retrySkipped picks them up with a later key", async () => {
    const hub = new MemorySyncHub();
    const retired = generateKey();
    seed(hub, retired, ["old"]);
    let alternates: Uint8Array[] = [];
    const r = makeClient(hub, "dev-r", { alternateKeysFor: () => alternates });
    const dr = new Y.Doc();
    await r.client.addDoc(DOC, dr);
    r.client.start();
    await until(() => r.client.isSynced(DOC));
    expect(r.client.isPaused(DOC)).toBe(false);
    expect(r.client.getSkipped(DOC)).toHaveLength(1);
    alternates = [retired];
    expect(await r.client.retrySkipped(DOC)).toBe(true);
    await until(() => dr.getText("t").toString() === "old");
    expect(r.client.getSkipped(DOC)).toEqual([]);
    expect(await r.client.retrySkipped(DOC)).toBe(false);
  });
});

describe("connection hygiene and storage failures", () => {
  /** Wraps a socket factory; `onFrame` may react to server frames (e.g. drop the link). */
  function wrapFactory(
    inner: (url: string) => WebSocketLike,
    onOpen: () => void,
    onFrame?: (raw: string, socket: WebSocketLike) => void,
  ) {
    return (url: string): WebSocketLike => {
      const s = inner(url);
      onOpen();
      const proxy: WebSocketLike = {
        get readyState() {
          return s.readyState;
        },
        send: (d) => s.send(d),
        close: (c, r) => s.close(c, r),
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
      };
      s.onopen = (e) => proxy.onopen?.(e);
      s.onclose = (e) => proxy.onclose?.(e);
      s.onerror = (e) => proxy.onerror?.(e);
      s.onmessage = (e) => {
        proxy.onmessage?.(e);
        onFrame?.(String(e.data), s);
      };
      return proxy;
    };
  }

  it("does not reset the backoff on welcome when the server drops right after it", async () => {
    const hub = new MemorySyncHub();
    let connects = 0;
    const factory = wrapFactory(
      hub.socketFactory(),
      () => connects++,
      (raw, s) => {
        if (raw.includes('"welcome"')) setTimeout(() => s.close(), 0);
      },
    );
    const a = makeClient(hub, "dev-a", {
      createSocket: factory,
      backoff: { initialMs: 20, maxMs: 2000 },
      stableAfterMs: 5000,
    });
    a.client.start();
    await new Promise((r) => setTimeout(r, 700));
    await a.client.stop();
    // Exponential: ~20, 40, 80, 160, 320 ms → about 5–6 connects (a reset loop would be ~25+).
    expect(connects).toBeLessThanOrEqual(8);
    expect(connects).toBeGreaterThanOrEqual(3);
  });

  it("waits for retry-after before reconnecting when the server closes after rate_limited", async () => {
    const hub = new MemorySyncHub();
    const times: number[] = [];
    const inner = hub.socketFactory();
    const factory = (url: string): WebSocketLike => {
      times.push(Date.now());
      const s = inner(url);
      const realSend = s.send.bind(s);
      // First connection: answer the hello with rate_limited (retry after 300 ms).
      if (times.length === 1) {
        s.send = () => {
          setTimeout(() => {
            s.onmessage?.({
              data: JSON.stringify({
                type: "error",
                code: "rate_limited",
                message: "slow down",
                retryAfterMs: 300,
              }),
            });
            s.close(); // too many connections: the server closes (1013) after the error
          }, 0);
        };
      } else {
        s.send = realSend;
      }
      return s;
    };
    const a = makeClient(hub, "dev-a", {
      createSocket: factory,
      backoff: { initialMs: 10, maxMs: 50 },
    });
    await a.client.addDoc(DOC, new Y.Doc());
    a.client.start();
    await until(() => a.client.isSynced(DOC), 10_000);
    expect(times.length).toBeGreaterThanOrEqual(2);
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(290);
  });

  it("holds sending without reconnecting on a message-rate limit, then resends", async () => {
    const hub = new MemorySyncHub();
    let connects = 0;
    let limited = false;
    const inner = hub.socketFactory();
    const factory = (url: string): WebSocketLike => {
      connects++;
      const s = inner(url);
      const send = s.send.bind(s);
      s.send = (d: string) => {
        const m = JSON.parse(d) as { type: string; clientMsgId?: string };
        if (m.type === "push" && !limited) {
          limited = true; // the server drops this push and answers rate_limited
          setTimeout(() => {
            s.onmessage?.({
              data: JSON.stringify({
                type: "error",
                code: "rate_limited",
                message: "too many messages",
                ref: m.clientMsgId,
                retryAfterMs: 200,
              }),
            });
          }, 0);
          return;
        }
        send(d);
      };
      return s;
    };
    const a = makeClient(hub, "dev-a", { createSocket: factory });
    const da = new Y.Doc();
    await a.client.addDoc(DOC, da);
    a.client.start();
    await until(() => a.client.isSynced(DOC));
    const t0 = Date.now();
    da.getText("t").insert(0, "x");
    await until(() => hub.docs.get(DOC)!.items.length === 1);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(190);
    expect(connects).toBe(1);
    await until(async () => (await a.storage.listOutbox()).length === 0);
  });

  it("keeps edits when the outbox storage fails and sends them once it recovers", async () => {
    const hub = new MemorySyncHub();
    const storage = new MemorySyncStorage();
    let failures = 2;
    const realEnqueue = storage.enqueue.bind(storage);
    storage.enqueue = async (item) => {
      if (failures > 0) {
        failures--;
        throw new DOMException("quota", "QuotaExceededError");
      }
      return realEnqueue(item);
    };
    const states: boolean[] = [];
    const a = makeClient(hub, "dev-a", { storage, storageRetryMs: 20 });
    a.client.on("storage", (ok) => states.push(ok));
    const da = new Y.Doc();
    await a.client.addDoc(DOC, da);
    a.client.start();
    await until(() => a.client.isSynced(DOC));
    da.getText("t").insert(0, "precious");
    await until(() => a.client.storageFull);
    await until(() => hub.docs.get(DOC)!.items.length === 1);
    expect(a.client.storageFull).toBe(false);
    expect(states).toEqual([false, true]);
    const b = makeClient(hub, "dev-b");
    const db = new Y.Doc();
    await b.client.addDoc(DOC, db);
    b.client.start();
    await until(() => db.getText("t").toString() === "precious");
  });

  it("splits subscribe into messages of at most 1000 distinct documents", async () => {
    const hub = new MemorySyncHub();
    const subscribes: number[] = [];
    const inner = hub.socketFactory();
    const factory = (url: string): WebSocketLike => {
      const s = inner(url);
      const send = s.send.bind(s);
      s.send = (d: string) => {
        const m = JSON.parse(d) as { type: string; docs?: unknown[] };
        if (m.type === "subscribe") subscribes.push(m.docs!.length);
        send(d);
      };
      return s;
    };
    const ids = Array.from({ length: 2500 }, () => uuidv7());
    const a = makeClient(hub, "dev-a", { createSocket: factory });
    let synced = 0;
    a.client.on("synced", () => synced++);
    await a.client.addDocs(ids.map((docId) => ({ docId, doc: new Y.Doc() })));
    a.client.start();
    await until(() => synced === 2500);
    expect(subscribes).toEqual([1000, 1000, 500]);
  });
});
