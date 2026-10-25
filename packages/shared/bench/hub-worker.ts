// Worker thread hosting a MemorySyncHub behind a real WebSocket server, so
// memory benchmarks measure the client heap only.
import { parentPort, workerData } from "node:worker_threads";
import * as Y from "yjs";
import { WebSocketServer } from "ws";
import {
  MemorySyncHub,
  createNoteDoc,
  encryptDocUpdate,
  fromBase64Url,
  initCrypto,
  toBase64Url,
} from "../dist/index.js"; // built package: the tsx loader does not map .js → .ts inside workers

const { ids, key } = workerData as { ids: string[]; key: string };
await initCrypto();
const state = Y.encodeStateAsUpdate(
  createNoteDoc({
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
  }),
);
const hub = new MemorySyncHub();
for (const id of ids) {
  hub.registerDoc(id);
  const d = hub.docs.get(id)!;
  d.snapshot = { seq: 1, payload: toBase64Url(encryptDocUpdate(fromBase64Url(key), id, state)) };
  d.seq = 1;
}
const wss = new WebSocketServer({ port: 0 });
wss.on("connection", (socket) => {
  const link = hub.connect(
    (raw) => socket.send(raw),
    () => socket.close(),
  );
  socket.on("message", (data) => link.receive(data.toString()));
  socket.on("close", () => link.disconnect());
});
wss.once("listening", () => {
  parentPort!.postMessage({
    port: (wss.address() as { port: number }).port,
    stateBytes: state.length,
  });
});
