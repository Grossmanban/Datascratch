import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { repairTitles } from "../src/collab/repairTitle";
import { makeEditor, tick } from "./helpers";

// packages/test-vectors/vectors/agents/create-note.json: a note exactly as the agent API writes it
// (create_note) and the delta of edit_note replace_text on its title.
import vectorJson from "../../test-vectors/vectors/agents/create-note.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vector = vectorJson as any;
const b64 = (s: string) => Uint8Array.from(Buffer.from(s, "base64url"));

type Json = { type: string; attrs?: Record<string, unknown>; content?: Json[]; marks?: Json[]; text?: string };

/** The editor's JSON in the canonical form of the vectors: null attributes left out. */
function canonical(node: Json): Json {
  const out: Json = { type: node.type };
  if (node.attrs) {
    const attrs = Object.fromEntries(Object.entries(node.attrs).filter(([, v]) => v !== null && v !== undefined));
    if (Object.keys(attrs).length) out.attrs = attrs;
  }
  if (node.text !== undefined) out.text = node.text;
  if (node.marks?.length) out.marks = node.marks.map(canonical);
  if (node.content?.length) out.content = node.content.map(canonical);
  return out;
}

async function open(doc: Y.Doc) {
  let updates = 0;
  doc.on("update", () => updates++);
  const { editor } = makeEditor(doc);
  await tick();
  await tick();
  return { editor, updates: () => updates };
}

describe("agents test vector: create_note + edit_note(replace_text on the title)", () => {
  for (const step of ["createNote", "editTitle"] as const) {
    it(`${step}: opens without writing, repair is a no-op, content as expected`, async () => {
      const doc = new Y.Doc();
      Y.applyUpdate(doc, b64(vector.createNote.update));
      if (step === "editTitle") Y.applyUpdate(doc, b64(vector.editTitle.update));
      expect(repairTitles(doc.getXmlFragment("content"))).toEqual({ deletedEmptyTitles: 0, deletedEmptyParagraphs: 0, restoredFromParagraph: false });
      const { editor, updates } = await open(doc);
      expect(updates()).toBe(0);
      const expected = vector[step].expected.content as Json;
      expect(expected.content!.length).toBeGreaterThan(5);
      expect(canonical(editor.getJSON() as Json)).toEqual(canonical(expected));
      if (step === "editTitle") expect(editor.state.doc.firstChild!.textContent).toBe("План на месяц");
      editor.destroy();
    });
  }
});
