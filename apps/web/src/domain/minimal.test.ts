import { describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { accountMaps, readAccount } from "./account";
import { toYMap } from "./ymap";

const account = new Y.Doc();
vi.mock("@/data/runtime", () => ({ runtime: () => ({ account }) }));

const { closeTab, openTab } = await import("./actions");
const { useWorkspace } = await import("./workspace");
const { features } = await import("@/lib/features");

describe("minimal build (D-51)", () => {
  it("is the default: no tasks or calendar; tabs are on (D-51 amendment 2026-11-02)", () => {
    expect(features).toEqual({ tasks: false, calendar: false, tabs: true });
  });

  it("writes tabs now that they are on", () => {
    const m = accountMaps(account);
    account.transact(() => {
      m.spaces.set("sp", toYMap({ id: "sp", name: "sp", icon: "", color: "tint.gray", order: 1, createdAt: "" }));
      m.notebooks.set("nb", toYMap({ id: "nb", spaceId: "sp", name: "nb", icon: "", color: "tint.gray", order: 1, mode: "private", createdAt: "" }));
      // Written by an extended client: kept as is.
      m.tabs.push([{ noteId: "old", openedAt: "2020-01-01T00:00:00.000Z" }]);
      m.settings.set("activeTab", "n1");
      m.settings.set("dailyNotebookId", "nb");
    });
    useWorkspace.setState({
      activeSpaceId: "sp",
      notes: { n1: { id: "n1", notebookId: "nb", title: "n1", kind: "note", tags: [], updatedAt: "" } as never },
      account: readAccount(account),
    });
    openTab("n1");
    expect(accountMaps(account).tabs.toArray().map((t) => (t as { noteId: string }).noteId)).toContain("n1");
    closeTab("n1");
    expect(accountMaps(account).tabs.toArray().map((t) => (t as { noteId: string }).noteId)).not.toContain("n1");
  });
});
