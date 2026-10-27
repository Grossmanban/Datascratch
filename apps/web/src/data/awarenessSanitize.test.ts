import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { sanitizeAwarenessUpdate, sanitizeUser } from "./awarenessSanitize";

function updateWith(state: Record<string, unknown> | null) {
  const a = new Awareness(new Y.Doc());
  a.setLocalState(state);
  return { update: encodeAwarenessUpdate(a, [a.clientID]), clientID: a.clientID };
}

function received(update: Uint8Array) {
  const b = new Awareness(new Y.Doc());
  applyAwarenessUpdate(b, sanitizeAwarenessUpdate(update), "remote");
  return b;
}

describe("remote awareness is validated (audit 2026-10-27)", () => {
  it("keeps a valid user and the other fields byte-compatible with y-protocols", () => {
    const { update, clientID } = updateWith({ user: { name: "Аня", color: "#2E5BDB", kind: "user" }, cursor: { anchor: 1 }, ts: 5 });
    expect(received(update).getStates().get(clientID)).toEqual({ user: { name: "Аня", color: "#2E5BDB", kind: "user" }, cursor: { anchor: 1 }, ts: 5 });
  });

  it("drops a user whose color is not a hex color and cleans the name", () => {
    const bad = updateWith({ user: { name: "x", color: "red;background:url(https://evil.example/t)" }, cursor: null });
    expect(received(bad.update).getStates().get(bad.clientID)).toEqual({ cursor: null });
    expect(sanitizeUser({ name: "a‮b\n".padEnd(200, "z"), color: "#abc" })).toEqual({ name: "ab" + "z".repeat(62), color: "#abc", kind: "guest" });
    expect(sanitizeUser({ name: 5, color: "#abcdef12", kind: "admin" })).toEqual({ name: "Гость", color: "#abcdef12", kind: "guest" });
  });

  it("passes a removal through and rejects malformed updates", () => {
    const gone = updateWith(null);
    expect(() => sanitizeAwarenessUpdate(gone.update)).not.toThrow();
    expect(() => sanitizeAwarenessUpdate(Uint8Array.of(1, 5, 1, 3, 0x7b, 0x7b, 0x7b))).toThrow();
    expect(() => sanitizeAwarenessUpdate(Uint8Array.of(1, 5))).toThrow();
    const arr = new TextEncoder().encode("[1]");
    expect(() => sanitizeAwarenessUpdate(Uint8Array.of(1, 5, 1, arr.length, ...arr))).toThrow();
  });
});
