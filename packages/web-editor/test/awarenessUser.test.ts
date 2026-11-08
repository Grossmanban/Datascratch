import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { setAwarenessUser } from "../src/collab/collaboration";

describe("setAwarenessUser", () => {
  it("sets the caret's name and colour and keeps the app's own fields (kind, account)", () => {
    const a = new Awareness(new Y.Doc());
    a.setLocalStateField("user", { name: "old", color: "#000000", kind: "user", account: "acc-1" });
    setAwarenessUser(a, { name: "Аня", color: "#2E5BDB" });
    expect(a.getLocalState()?.user).toEqual({ name: "Аня", color: "#2E5BDB", kind: "user", account: "acc-1" });
    const b = new Awareness(new Y.Doc());
    setAwarenessUser(b, { name: "Гость", color: "#D2453B" });
    expect(b.getLocalState()?.user).toEqual({ name: "Гость", color: "#D2453B" });
  });
});
