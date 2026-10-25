import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientMessage, ServerMessage } from "@/lib/shared";
import { createSyncStatusStore, SyncEngine, type OutgoingMessage, type SyncHost } from "./engine";

class FakeSocket {
  static last: FakeSocket | null = null;
  static OPEN = 1;
  static CLOSED = 3;
  readyState = 0;
  sent: ClientMessage[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.last = this;
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data) as ClientMessage);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  receive(msg: ServerMessage) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
}

const tick = () => new Promise((r) => setTimeout(r, 5));

function makeHost(over: Partial<SyncHost> = {}): SyncHost & { applied: string[]; acked: string[]; out: OutgoingMessage[] } {
  const applied: string[] = [];
  const acked: string[] = [];
  const out: OutgoingMessage[] = [];
  return {
    applied,
    acked,
    out,
    deviceId: async () => "dev-1",
    auth: async () => ({ kind: "user", accessToken: "tok" }),
    refreshAuth: async () => true,
    subscriptions: async () => [{ docId: "acc", since: 3 }],
    beforeFlush: async () => true,
    outgoing: async () => out.filter((m) => !acked.includes(m.clientMsgId)),
    onUpdates: async (m) => {
      applied.push(...m.items.map((i) => `${m.docId}:${i.seq}`));
    },
    onUpdate: async (m) => {
      applied.push(`${m.docId}:${m.seq}`);
    },
    onAck: async (m) => {
      acked.push(m.clientMsgId);
    },
    ...over,
  };
}

describe("SyncEngine (sync-protocol.md v1)", () => {
  const OrigWS = globalThis.WebSocket;
  afterEach(() => {
    globalThis.WebSocket = OrigWS;
    vi.useRealTimers();
  });

  it("hello → welcome → subscribe → updates → push/ack", async () => {
    globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
    const host = makeHost();
    host.out.push({ type: "push", docId: "acc", clientMsgId: "m1", payload: "AA" });
    const status = createSyncStatusStore();
    const engine = new SyncEngine(host, status, () => "ws://x/v1/sync");
    engine.start();
    await tick();
    const ws = FakeSocket.last!;
    expect(ws.sent[0]).toMatchObject({ type: "hello", protocol: 1, auth: { kind: "user", accessToken: "tok" }, deviceId: "dev-1", client: { platform: "web" } });
    ws.receive({ type: "welcome", userId: "u", serverTime: new Date().toISOString(), protocol: 1 });
    await tick();
    expect(ws.sent.find((m) => m.type === "subscribe")).toEqual({ type: "subscribe", docs: [{ docId: "acc", since: 3 }] });
    expect(ws.sent.find((m) => m.type === "push")).toMatchObject({ docId: "acc", clientMsgId: "m1" });
    expect(status.getState().status).toBe("syncing");
    ws.receive({ type: "updates", docId: "acc", snapshot: null, items: [{ seq: 4, payload: "x", deviceId: "d2" }], upToDate: true });
    ws.receive({ type: "ack", docId: "acc", clientMsgId: "m1", seq: 5 });
    await tick();
    expect(host.applied).toEqual(["acc:4"]);
    expect(host.acked).toEqual(["m1"]);
    expect(status.getState().status).toBe("online");
    engine.stop();
    expect(status.getState().status).toBe("offline");
  });

  it("does not resend in-flight pushes on repeated flushes, resends after reconnect", async () => {
    globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
    const host = makeHost();
    host.out.push({ type: "push", docId: "acc", clientMsgId: "m1", payload: "AA" });
    const engine = new SyncEngine(host, createSyncStatusStore(), () => "ws://x");
    engine.start();
    await tick();
    let ws = FakeSocket.last!;
    ws.receive({ type: "welcome", userId: "u", serverTime: "", protocol: 1 });
    await tick();
    await engine.flush();
    await engine.flush();
    expect(ws.sent.filter((m) => m.type === "push")).toHaveLength(1);
    ws.close();
    engine.reconnectNow();
    await tick();
    ws = FakeSocket.last!;
    ws.receive({ type: "welcome", userId: "u", serverTime: "", protocol: 1 });
    await tick();
    expect(ws.sent.filter((m) => m.type === "push")).toHaveLength(1);
    engine.stop();
  });

  it("refreshes auth and reconnects on unauthorized", async () => {
    globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
    const refreshAuth = vi.fn(async () => true);
    const engine = new SyncEngine(makeHost({ refreshAuth }), createSyncStatusStore(), () => "ws://x");
    engine.start();
    await tick();
    FakeSocket.last!.receive({ type: "error", code: "unauthorized", message: "expired" });
    await tick();
    expect(refreshAuth).toHaveBeenCalled();
    engine.stop();
  });
});
