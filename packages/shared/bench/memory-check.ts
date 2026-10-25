// CI guard: client memory for N notes synced in stored mode stays under a budget.
// The server side runs in a worker thread (own heap); only the client heap is
// measured, including the app's saved note states (stand-in for IndexedDB).
// Run: node --expose-gc --import tsx bench/memory-check.ts [N] [budgetMB]
import { Worker } from "node:worker_threads";
import WebSocket from "ws";
import * as Y from "yjs";
import {
  MemorySyncStorage,
  SyncClient,
  generateKey,
  initCrypto,
  toBase64Url,
  uuidv7,
  type WebSocketLike,
} from "../src/index.js";

const N = Number(process.argv[2] ?? 10_000);
const BUDGET_MB = Number(process.argv[3] ?? 80);
const gc = (globalThis as { gc?: () => void }).gc;
if (!gc) throw new Error("run with node --expose-gc");
/** JS heap plus ArrayBuffer backing stores (Uint8Array states live there) of this thread. */
const heap = () => {
  const m = process.memoryUsage();
  return m.heapUsed + m.arrayBuffers;
};

await initCrypto();
const key = generateKey();
const ids = Array.from({ length: N }, () => uuidv7());
const worker = new Worker(new URL("./hub-worker.ts", import.meta.url), {
  workerData: { ids, key: toBase64Url(key) },
  execArgv: ["--import", "tsx"],
});
const { port, stateBytes } = await new Promise<{ port: number; stateBytes: number }>(
  (resolve, reject) => {
    worker.once("message", resolve);
    worker.once("error", reject);
  },
);

gc();
const before = heap();
const saved = new Map<string, Uint8Array>();
let savedBytes = 0;
const client = new SyncClient({
  url: `ws://127.0.0.1:${port}/v1/sync`,
  auth: () => ({ kind: "user", accessToken: "t" }),
  deviceId: "mem",
  client: { platform: "web", version: "bench" },
  storage: new MemorySyncStorage(),
  keyFor: () => key,
  createSocket: (url) => new WebSocket(url) as unknown as WebSocketLike,
  storedDocs: {
    onUpdates: (docId, updates) => {
      const prev = saved.get(docId);
      const next = Y.mergeUpdates(prev ? [prev, ...updates] : updates);
      savedBytes += next.length - (prev?.length ?? 0);
      saved.set(docId, next);
    },
    loadState: (docId) => saved.get(docId) ?? null,
  },
});
let synced = 0;
const done = new Promise<void>((resolve) =>
  client.on("synced", () => {
    if (++synced === N) resolve();
  }),
);
const t = performance.now();
await client.addStoredDocs(ids);
client.start();
await done;
await client.flush();
gc();
const clientMb = (heap() - before) / 1e6;
const savedMb = savedBytes / 1e6;
console.warn(
  `stored mode: ${N} notes × ${stateBytes} B synced in ${((performance.now() - t) / 1000).toFixed(1)} s; ` +
    `client memory +${clientMb.toFixed(0)} MB (saved states ${savedMb.toFixed(0)} MB of it, budget ${BUDGET_MB} MB)`,
);
await client.stop();
await worker.terminate();
if (saved.size !== N) throw new Error(`only ${saved.size} of ${N} notes stored`);
if (clientMb > BUDGET_MB) {
  console.error(`memory budget exceeded: ${clientMb.toFixed(0)} MB > ${BUDGET_MB} MB`);
  process.exit(1);
}
