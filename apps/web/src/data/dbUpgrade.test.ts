import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { AccountDB } from "./db";

describe("account DB upgrade", () => {
  it("moves unsent pushes of the old engine into the SyncClient outbox", async () => {
    const name = `upgrade-${Math.random()}`;
    const v2 = new Dexie(`ds-account-${name}`);
    v2.version(2).stores({ docs: "docId", updates: "++id, docId", outbox: "++id, docId, clientMsgId", ops: "++id" });
    await v2.table("outbox").add({ docId: "d", clientMsgId: "m1", type: "push", payload: "AQ", createdAt: 1 });
    v2.close();
    const db = new AccountDB(name);
    const rows = await db.syncOutbox.toArray();
    expect(rows.map((r) => [r.clientMsgId, r.kind, r.payload])).toEqual([["m1", "push", "AQ"]]);
    expect(db.tables.some((t) => t.name === "outbox")).toBe(false);
    db.close();
  });
});
