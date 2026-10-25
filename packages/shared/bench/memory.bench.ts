// Memory of N synced notes: live Y.Doc per note vs. stored binary state.
// Run: node --expose-gc --import tsx bench/memory.bench.ts [N]
import * as Y from "yjs";
import { createNoteDoc } from "../src/index.js";

const N = Number(process.argv[2] ?? 10_000);
const gc = (globalThis as { gc?: () => void }).gc;
if (!gc) throw new Error("run with node --expose-gc");
const mb = (b: number) => `${(b / 1e6).toFixed(0)} MB`;

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

gc();
let base = process.memoryUsage();
const docs: Y.Doc[] = [];
let t = performance.now();
for (let i = 0; i < N; i++) {
  const d = new Y.Doc();
  Y.applyUpdate(d, state);
  docs.push(d);
}
gc();
let now = process.memoryUsage();
console.warn(
  `live Y.Doc × ${N}: ${mb(now.heapUsed - base.heapUsed)} heap, applied in ${(performance.now() - t).toFixed(0)} ms`,
);
docs.length = 0;

gc();
base = process.memoryUsage();
const stored: Uint8Array[] = [];
for (let i = 0; i < N; i++) stored.push(state.slice());
gc();
now = process.memoryUsage();
console.warn(
  `binary state × ${N}: ${mb(now.heapUsed - base.heapUsed + now.arrayBuffers - base.arrayBuffers)} (${state.length} B each)`,
);

t = performance.now();
for (const s of stored) {
  const d = new Y.Doc();
  Y.applyUpdate(d, s);
  d.getXmlFragment("content").toJSON();
  d.destroy();
}
console.warn(
  `transient Y.Doc per note (index, then drop): ${(performance.now() - t).toFixed(0)} ms`,
);
