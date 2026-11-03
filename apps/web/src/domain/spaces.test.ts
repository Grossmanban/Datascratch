import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { accountMaps, readAccount } from "./account";
import { toYMap } from "./ymap";

const account = new Y.Doc();
vi.mock("@/data/runtime", () => ({ runtime: () => ({ account }) }));
// These are extended-mode features (D-51); the flag is off in the default build.
vi.mock("@/lib/features", () => ({ extendedMode: true, features: { tasks: true, calendar: true, tabs: true } }));

const { activeTabOf, closeTab, dailyNotebookId, migrateSpaceSettings, openTab } = await import("./actions");
const { tabsInSpace, useWorkspace } = await import("./workspace");

type Note = { id: string; notebookId: string };
function setup(notes: Note[], settings: Record<string, unknown> = {}) {
  const m = accountMaps(account);
  account.transact(() => {
    m.spaces.clear();
    m.notebooks.clear();
    m.settings.clear();
    m.tabs.delete(0, m.tabs.length);
    for (const [id, order] of [["work", 1], ["home", 2]] as const)
      m.spaces.set(id, toYMap({ id, name: id, icon: "", color: "tint.gray", order, createdAt: "" }));
    for (const [id, spaceId, order] of [["nb-w", "work", 1], ["nb-w2", "work", 2], ["nb-h", "home", 3]] as const)
      m.notebooks.set(id, toYMap({ id, spaceId, name: id, icon: "", color: "tint.gray", order, mode: "private", createdAt: "" }));
    for (const [k, v] of Object.entries(settings)) m.settings.set(k, v);
  });
  const refresh = () => useWorkspace.setState({ account: readAccount(account) });
  refresh();
  useWorkspace.setState({
    activeSpaceId: "work",
    notes: Object.fromEntries(notes.map((n) => [n.id, { ...n, title: n.id, kind: "note", tags: [], updatedAt: "" } as never])),
  });
  return refresh;
}

describe("isolated spaces (D-48)", () => {
  beforeEach(() => useWorkspace.setState({ notes: {} }));

  it("moves the legacy active tab and daily notebook to their own space, once", () => {
    const refresh = setup([{ id: "n-h", notebookId: "nb-h" }], { activeTab: "n-h", dailyNotebookId: "nb-h" });
    migrateSpaceSettings();
    refresh();
    const s = useWorkspace.getState().account.settings;
    expect(s.activeTabBySpace).toEqual({ home: "n-h" });
    expect(s.dailyNotebookBySpace).toEqual({ home: "nb-h" });
    // The legacy keys stay for older clients and are not written again.
    expect(s.activeTab).toBe("n-h");

    // A space that already has its own entry keeps it.
    accountMaps(account).settings.set("dailyNotebookBySpace", { home: "nb-h", work: "nb-w2" });
    accountMaps(account).settings.set("dailyNotebookId", "nb-w");
    refresh();
    migrateSpaceSettings();
    refresh();
    expect(useWorkspace.getState().account.settings.dailyNotebookBySpace).toEqual({ home: "nb-h", work: "nb-w2" });
  });

  it("has a daily notebook per space, defaulting to the space's first notebook", () => {
    const refresh = setup([], { dailyNotebookBySpace: { work: "nb-w2" } });
    refresh();
    expect(dailyNotebookId("work")).toBe("nb-w2");
    expect(dailyNotebookId("home")).toBe("nb-h");
    expect(dailyNotebookId()).toBe("nb-w2");
  });

  it("keeps a set of tabs and an active tab per space", () => {
    const refresh = setup([
      { id: "w1", notebookId: "nb-w" },
      { id: "w2", notebookId: "nb-w2" },
      { id: "h1", notebookId: "nb-h" },
    ]);
    for (const id of ["w1", "h1", "w2"]) {
      openTab(id);
      refresh();
    }
    const st = useWorkspace.getState();
    expect(tabsInSpace(st, "work").map((t) => t.noteId)).toEqual(["w1", "w2"]);
    expect(tabsInSpace(st, "home").map((t) => t.noteId)).toEqual(["h1"]);
    expect(st.account.settings.activeTabBySpace).toEqual({ work: "w2", home: "h1" });
    expect(activeTabOf("home")).toBe("h1");

    // Closing the active tab of a space moves to a tab of the same space, never another space's.
    expect(closeTab("w2")).toBe("w1");
    refresh();
    expect(activeTabOf("work")).toBe("w1");
    expect(closeTab("w1")).toBeNull();
    refresh();
    expect(activeTabOf("work")).toBeNull();
    expect(activeTabOf("home")).toBe("h1");
  });
});
