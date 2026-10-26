import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { accountMaps, readAccount } from "./account";
import { toYMap } from "./ymap";

const account = new Y.Doc();
vi.mock("@/data/runtime", () => ({ runtime: () => ({ account }) }));

const { closeOtherTabs, openTab, setTabPinned, tidyTabs } = await import("./actions");
const { useWorkspace } = await import("./workspace");
const { useClosedTabs } = await import("@/lib/closedTabs");

const DAY = 86_400_000;
const refresh = () => useWorkspace.setState({ account: readAccount(account) });
const tabs = () => useWorkspace.getState().account.tabs;

function setup(tabsIn: { noteId: string; pinned?: boolean; openedAt?: string }[], settings: Record<string, unknown> = {}) {
  const m = accountMaps(account);
  account.transact(() => {
    m.spaces.clear();
    m.notebooks.clear();
    m.settings.clear();
    m.tabs.delete(0, m.tabs.length);
    m.spaces.set("sp", toYMap({ id: "sp", name: "sp", icon: "", color: "tint.gray", order: 1, createdAt: "" }));
    m.notebooks.set("nb", toYMap({ id: "nb", spaceId: "sp", name: "nb", icon: "", color: "tint.gray", order: 1, mode: "private", createdAt: "" }));
    for (const [k, v] of Object.entries(settings)) m.settings.set(k, v);
    m.tabs.push(tabsIn);
  });
  useWorkspace.setState({
    activeSpaceId: "sp",
    notes: Object.fromEntries(tabsIn.map((t) => [t.noteId, { id: t.noteId, notebookId: "nb", title: t.noteId, kind: "note", tags: [], updatedAt: "" } as never])),
  });
  refresh();
}

describe("tabs (spec/12 §12.6, document-model §2)", () => {
  beforeEach(() => {
    useClosedTabs.setState({}, true);
    localStorage.setItem("ds.tabsEpoch", String(Date.now()));
  });

  it("tidies tabs not opened for tabTidyDays into «Недавно закрытые», never pinned, active or shown ones", () => {
    const old = new Date(Date.now() - 10 * DAY).toISOString();
    setup(
      [
        { noteId: "old", openedAt: old },
        { noteId: "pinned", openedAt: old, pinned: true },
        { noteId: "active", openedAt: old },
        { noteId: "shown", openedAt: old },
        { noteId: "fresh", openedAt: new Date().toISOString() },
        { noteId: "legacy" }, // no openedAt: counts as opened at this version's first run
      ],
      { activeTabBySpace: { sp: "active" } },
    );
    tidyTabs("shown");
    refresh();
    expect(tabs().map((t) => t.noteId)).toEqual(["pinned", "active", "shown", "fresh", "legacy"]);
    expect(useClosedTabs.getState().sp?.map((c) => c.noteId)).toEqual(["old"]);
  });

  it("honours the setting: never, or a shorter period", () => {
    const twoDays = new Date(Date.now() - 2 * DAY).toISOString();
    setup([{ noteId: "a", openedAt: twoDays }], { tabTidyDays: null });
    tidyTabs(null);
    refresh();
    expect(tabs()).toHaveLength(1);
    setup([{ noteId: "a", openedAt: twoDays }], { tabTidyDays: 1 });
    tidyTabs(null);
    refresh();
    expect(tabs()).toHaveLength(0);
  });

  it("writes openedAt at most once an hour, and keeps pinned tabs on «Закрыть остальные»", () => {
    const halfHour = new Date(Date.now() - 30 * 60_000).toISOString();
    setup([{ noteId: "a", openedAt: halfHour }, { noteId: "b" }, { noteId: "c" }]);
    openTab("a");
    refresh();
    expect(tabs()[0]!.openedAt).toBe(halfHour);
    openTab("b");
    refresh();
    expect(tabs()[1]!.openedAt).toBeTruthy();

    setTabPinned("c", true);
    refresh();
    expect(tabs()[2]).toMatchObject({ noteId: "c", pinned: true });
    closeOtherTabs("a");
    refresh();
    expect(tabs().map((t) => t.noteId)).toEqual(["a", "c"]);
    setTabPinned("c", false);
    refresh();
    expect(tabs()[1]!.pinned).toBeUndefined();
  });
});
