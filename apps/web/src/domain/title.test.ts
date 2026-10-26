import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { defaultNoteTitle, hasBody, initNoteDoc, isNoteEmpty, setTitle } from "./note";

describe("new note title (spec/04)", () => {
  it("names an untitled note by its creation day, in the interface language", () => {
    expect(defaultNoteTitle("2026-10-26T09:00:00", "ru")).toBe("Заметка 26 октября 2026");
    expect(defaultNoteTitle("2026-10-26T09:00:00", "en")).toBe("Note Oct 26, 2026");
  });
});

describe("empty notes", () => {
  it("is empty with no title, empty paragraphs and no drawing", () => {
    const doc = new Y.Doc();
    initNoteDoc(doc, { body: [""] });
    expect(isNoteEmpty(doc)).toBe(true);
    expect(hasBody(doc)).toBe(false);
    setTitle(doc, "Заметка");
    expect(isNoteEmpty(doc)).toBe(false);
    expect(hasBody(doc)).toBe(false);
  });

  it("has a body once there is text after the title", () => {
    const doc = new Y.Doc();
    initNoteDoc(doc, { body: ["текст"] });
    expect(isNoteEmpty(doc)).toBe(false);
    expect(hasBody(doc)).toBe(true);
  });
});
