import { WebSocket, WebSocketServer } from "ws";
import * as Y from "yjs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  MemorySyncHub,
  MemorySyncStorage,
  SyncClient,
  generateKey,
  initCrypto,
  encryptDocUpdate,
  toBase64Url,
  type SkippedUpdate,
  type SyncClientError,
  type SyncClientOptions,
  type SyncStatus,
  type WebSocketLike,
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
    const hub = new MemorySyncHub({ preferSnapshot: true });
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
