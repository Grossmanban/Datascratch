import { WebSocket, WebSocketServer } from "ws";
import * as Y from "yjs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  MemorySyncHub,
  MemorySyncStorage,
  SyncClient,
  generateKey,
  initCrypto,
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
