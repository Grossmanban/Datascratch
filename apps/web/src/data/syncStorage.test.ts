import { describe, expect, it } from "vitest";
import { AccountDB } from "./db";
import { DexieSyncStorage } from "./syncStorage";

describe("DexieSyncStorage", () => {
  it("keeps cursors and the outbox in order", async () => {
    const db = new AccountDB(`test-${Math.random()}`);
    const s = new DexieSyncStorage(db);
    await s.setDocStates([
      ["a", { lastSeq: 3, updatesSinceSnapshot: 1, bytesSinceSnapshot: 10 }],
      ["b", { lastSeq: 7, updatesSinceSnapshot: 0, bytesSinceSnapshot: 0 }],
    ]);
    expect((await s.getDocStates(["a", "c", "b"])).get("b")?.lastSeq).toBe(7);
    expect(await s.getDocState("c")).toBeNull();
    for (const id of ["m1", "m2", "m3"])
      await s.enqueue({ clientMsgId: id, docId: "a", kind: "push", payload: "x", size: 1, createdAt: Date.now() });
    await s.removeOutbox("m2");
    expect((await s.listOutbox()).map((i) => i.clientMsgId)).toEqual(["m1", "m3"]);
    db.close();
  });

  it("keeps the protocol 3 account cursor and the documents' coverage", async () => {
    const db = new AccountDB(`test-${Math.random()}`);
    const s = new DexieSyncStorage(db);
    expect(await s.getResumeState()).toBeNull();
    await s.setResumeState({ cursor: "c1.42", epoch: "e1" });
    expect(await s.getResumeState()).toEqual({ cursor: "c1.42", epoch: "e1" });
    await s.setDocStates([["a", { lastSeq: 3, updatesSinceSnapshot: 0, bytesSinceSnapshot: 0, covered: "e1" }]]);
    expect((await s.getDocState("a"))?.covered).toBe("e1");
    expect((await s.getDocStates(["a"])).get("a")?.covered).toBe("e1");
    await s.setResumeState(null);
    expect(await s.getResumeState()).toBeNull();
    db.close();
  });
});
