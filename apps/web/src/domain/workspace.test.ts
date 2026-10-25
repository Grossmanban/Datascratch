import { beforeEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import { initNotebookDoc, notebookMaps } from "./notebook";
import { folderCounts, refreshNotebook, resetWorkspace, useWorkspace } from "./workspace";
import { toYMap } from "./ymap";

function note(id: string, title: string, folderId: string | null = null) {
  return toYMap({ id, title, folderId, parentNoteId: null, kind: "note", tags: ["a"], trashedAt: null, order: 1, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" });
}

describe("workspace snapshot (structural sharing for large lists)", () => {
  beforeEach(() => resetWorkspace());

  it("keeps unchanged entries and the notes map by identity", () => {
    const doc = new Y.Doc();
    initNotebookDoc(doc, "nb");
    const { notes } = notebookMaps(doc);
    notes.set("n1", note("n1", "One", "f1"));
    notes.set("n2", note("n2", "Two", "f1"));
    refreshNotebook("nb", doc);
    const first = useWorkspace.getState().notes;

    refreshNotebook("nb", doc);
    expect(useWorkspace.getState().notes).toBe(first);

    notes.get("n2")!.set("title", "Two!");
    refreshNotebook("nb", doc);
    const second = useWorkspace.getState().notes;
    expect(second).not.toBe(first);
    expect(second.n1).toBe(first.n1);
    expect(second.n2).not.toBe(first.n2);
    expect(second.n2!.title).toBe("Two!");
    expect(folderCounts(second).get("f1")).toBe(2);

    notes.delete("n1");
    refreshNotebook("nb", doc);
    expect(Object.keys(useWorkspace.getState().notes)).toEqual(["n2"]);
  });
});
