import { expect, test } from "@playwright/experimental-ct-react";
import { writeFileSync } from "node:fs";
import { PasteEditor } from "./PasteEditor";
import { pasteVectors, VECTORS_PATH, type PasteCase } from "./pasteFixtures";

// Shared paste vectors (spec/04 «Вставка с форматированием»): the same clipboard content gives the
// same blocks on the web and on iOS. UPDATE_VECTORS=1 rewrites `expected` from this editor's output.

type J = { type: string; attrs?: Record<string, unknown>; content?: J[]; marks?: J[]; text?: string };

/** Canonical JSON of the vectors: no blockId/taskId, null attributes left out. */
function canonical(node: J): J {
  const out: J = { type: node.type };
  const attrs = Object.fromEntries(Object.entries(node.attrs ?? {}).filter(([k, v]) => v !== null && v !== undefined && k !== "blockId" && k !== "taskId"));
  if (Object.keys(attrs).length) out.attrs = attrs;
  if (node.text !== undefined) out.text = node.text;
  if (node.marks?.length) out.marks = node.marks.map(canonical);
  if (node.content?.length) out.content = node.content.map(canonical);
  return out;
}

const update = !!process.env.UPDATE_VECTORS;
const vectors = pasteVectors();
const results = new Map<string, PasteCase["expected"]>();

test.describe.configure({ mode: update ? "serial" : "parallel" });

for (const c of vectors.cases) {
  test(`${c.name}: ${c.description}`, async ({ mount, page }) => {
    await mount(<PasteEditor />);
    await page.waitForFunction(() => window.__paste?.ready === true);
    const out = await page.evaluate((c) => {
      const ed = window.__paste!.api.editor;
      ed.commands.focus(ed.state.doc.firstChild!.nodeSize + 1);
      const dt = new DataTransfer();
      if (c.html !== undefined) dt.setData("text/html", c.html);
      dt.setData("text/plain", c.text ?? "");
      document.querySelector(".ds-prose")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
      // Read before the uploads start (they begin right after the paste transaction).
      const images: ({ src: string; alt: string } | null)[] = [];
      ed.state.doc.descendants((n) => {
        if (n.type.name === "image") images.push(window.__paste!.pendingImage(n.attrs.blockId));
        return true;
      });
      return { blocks: (ed.getJSON().content ?? []).slice(1), images };
    }, c);
    const blocks = (out.blocks as J[]).map(canonical);
    // The empty paragraph the editor keeps after a pasted block is not part of the paste.
    while (blocks.length && blocks[blocks.length - 1]!.type === "paragraph" && !blocks[blocks.length - 1]!.content) blocks.pop();
    const actual = { blocks, images: out.images as { src: string; alt: string }[] };
    if (update) results.set(c.name, actual);
    else expect(actual).toEqual(c.expected);
  });
}

test.afterAll(() => {
  if (!update || results.size !== vectors.cases.length) return;
  const next = { ...vectors, cases: vectors.cases.map((c) => ({ ...c, expected: results.get(c.name) })) };
  writeFileSync(VECTORS_PATH, JSON.stringify(next, null, 2) + "\n");
});
