// First sync of N notes (spec/11: 10 000 notes without attachments in under a minute).
// Client-side cost only: an in-memory hub serves one encrypted snapshot per note.
// Run: pnpm --filter @datascratch/shared bench [N]
import * as Y from "yjs";
import {
  MemorySyncHub,
  MemorySyncStorage,
  SyncClient,
  createNoteDoc,
  encryptDocUpdate,
  generateKey,
  initCrypto,
  toBase64Url,
  uuidv7,
} from "../src/index.js";

const N = Number(process.argv[2] ?? 10_000);
/** Simulated per-call storage latency (IndexedDB-like), ms. */
const LATENCY = Number(process.argv[3] ?? 0);

class SlowStorage extends MemorySyncStorage {
  calls = 0;
  private async wait() {
    this.calls++;
    if (LATENCY > 0) await new Promise((r) => setTimeout(r, LATENCY));
  }
  override async getDocState(id: string) {
    await this.wait();
    return super.getDocState(id);
  }
  override async setDocState(id: string, s: Parameters<MemorySyncStorage["setDocState"]>[1]) {
    await this.wait();
    return super.setDocState(id, s);
  }
  override async getDocStates(ids: string[]) {
    await this.wait();
    return super.getDocStates(ids);
  }
  override async setDocStates(e: Parameters<MemorySyncStorage["setDocStates"]>[0]) {
    await this.wait();
    return super.setDocStates(e);
  }
  override async listOutbox() {
    await this.wait();
    return super.listOutbox();
  }
}
await initCrypto();
const key = generateKey();
const hub = new MemorySyncHub({ catchUpChunk: 100 });

// A typical note: title + ~20 paragraphs (~2–3 KB of Yjs state).
const sample = createNoteDoc({
  title: "Meeting notes",
  blocks: Array.from({ length: 20 }, (_, i) => ({
    type: "paragraph",
    content: [
      {
        type: "text",
        text: `Paragraph ${i}: lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
      },
    ],
  })),
});
const state = Y.encodeStateAsUpdate(sample);
const ids: string[] = [];
let t = performance.now();
for (let i = 0; i < N; i++) {
  const id = uuidv7();
  ids.push(id);
  hub.registerDoc(id);
  hub.docs.get(id)!.snapshot = { seq: 1, payload: toBase64Url(encryptDocUpdate(key, id, state)) };
  hub.docs.get(id)!.seq = 1;
}
console.warn(`prepared ${N} notes × ${state.length} B in ${(performance.now() - t).toFixed(0)} ms`);

const storage = new SlowStorage();
const client = new SyncClient({
  url: "ws://hub",
  auth: () => ({ kind: "user", accessToken: "t" }),
  deviceId: "bench",
  client: { platform: "web", version: "bench" },
  storage,
  keyFor: () => key,
  createSocket: hub.socketFactory(),
});
const docs = ids.map(() => new Y.Doc());
let synced = 0;
const done = new Promise<void>((resolve) =>
  client.on("synced", () => {
    if (++synced === N) resolve();
  }),
);
t = performance.now();
await client.addDocs(ids.map((docId, i) => ({ docId, doc: docs[i]! })));
const tAdd = performance.now() - t;
client.start();
await done;
const total = performance.now() - t;
console.warn(
  `storage latency ${LATENCY} ms: addDoc ${tAdd.toFixed(0)} ms; first sync of ${N} notes ${(total / 1000).toFixed(2)} s; storage calls ${storage.calls}`,
);
await client.stop();
