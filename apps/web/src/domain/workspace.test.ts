import { beforeEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import { initNotebookDoc, notebookMaps } from "./notebook";
import { folderCounts, notesInSpace, ownNotebookIds, refreshNotebook, refreshStandaloneNote, resetWorkspace, SHARED_WITH_ME, spaceOfNote, useWorkspace, visibleNotes } from "./workspace";
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

describe("what is shared one by one (D-54) is listed in «Поделились со мной», not in a space (D-63)", () => {
  beforeEach(() => resetWorkspace());

  const space = (id: string, order: number) => ({ id, name: id, icon: null, color: null, order, createdAt: "2026-01-01T00:00:00Z" });
  const own = (id: string, spaceId: string) => ({ id, spaceId, name: id, icon: null, color: null, order: 1, mode: "private" as const, createdAt: "2026-01-01T00:00:00Z" });
  const notebook = (id: string, ...entries: [string, string][]) => {
    const doc = new Y.Doc();
    initNotebookDoc(doc, id);
    for (const [noteId, title] of entries) notebookMaps(doc).notes.set(noteId, note(noteId, title));
    refreshNotebook(id, doc);
  };
  const ids = (spaceId: string) => visibleNotes(notesInSpace(useWorkspace.getState(), spaceId)).map((n) => n.id).sort();

  it("lists a shared notebook's notes and a shared note in «Поделились со мной», in no space", () => {
    // prod 2026-11-02 asked for a shared notebook's notes beyond the notebook itself; since D-63
    // they live in their own section (its search and lists), whatever the legacy placement says.
    useWorkspace.setState({
      activeSpaceId: "personal",
      account: {
        ...useWorkspace.getState().account,
        spaces: [space("personal", 1), space("work", 2)],
        notebooks: [own("mine", "personal"), own("job", "work")],
        shared: [
          { kind: "notebook", id: "theirs", spaceId: "personal", order: 1, addedAt: "2026-10-28T00:00:00Z" },
          { kind: "note", id: "single", spaceId: "personal", order: 2, addedAt: "2026-10-28T00:00:00Z" },
        ],
      },
    });
    notebook("mine", ["m1", "Mine"]);
    notebook("job", ["j1", "Job"]);
    notebook("theirs", ["t1", "Капец"], ["t2", "Саня я починил"]);
    refreshStandaloneNote("single", { ...useWorkspace.getState().notes.m1!, id: "single", notebookId: "", title: "Single" });

    expect(ids("personal")).toEqual(["m1"]);
    expect(ids("work")).toEqual(["j1"]);
    expect(ids(SHARED_WITH_ME)).toEqual(["single", "t1", "t2"]);
    expect(spaceOfNote(useWorkspace.getState(), "t1")).toBe(SHARED_WITH_ME);
    // Trash and daily notes take only own notebooks: the owner empties a shared notebook's trash.
    expect([...ownNotebookIds(useWorkspace.getState().account, "personal")]).toEqual(["mine"]);
  });

  it("shows an item whose legacy placement space was deleted in «Поделились со мной», not nowhere", () => {
    useWorkspace.setState({
      account: {
        ...useWorkspace.getState().account,
        spaces: [space("personal", 1)],
        notebooks: [own("mine", "personal")],
        shared: [{ kind: "notebook", id: "theirs", spaceId: "gone", order: 1, addedAt: "2026-10-28T00:00:00Z" }],
      },
    });
    notebook("theirs", ["t1", "Капец"]);
    expect(ids("personal")).toEqual([]);
    expect(ids(SHARED_WITH_ME)).toEqual(["t1"]);
    expect(spaceOfNote(useWorkspace.getState(), "t1")).toBe(SHARED_WITH_ME);
  });
});
