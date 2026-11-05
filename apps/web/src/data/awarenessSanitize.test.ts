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

  it("keeps user.account (a string up to 64 characters) and drops anything else there", () => {
    expect(sanitizeUser({ name: "Аня", color: "#2E5BDB", kind: "user", account: "0192f3c4-acc" })).toEqual({ name: "Аня", color: "#2E5BDB", kind: "user", account: "0192f3c4-acc" });
    expect(sanitizeUser({ name: "Аня", color: "#2E5BDB", account: "x".repeat(65) })).toEqual({ name: "Аня", color: "#2E5BDB", kind: "guest" });
    expect(sanitizeUser({ name: "Аня", color: "#2E5BDB", account: { id: 1 } })).toEqual({ name: "Аня", color: "#2E5BDB", kind: "guest" });
    expect(sanitizeUser({ name: "Аня", color: "#2E5BDB", account: "" })).toEqual({ name: "Аня", color: "#2E5BDB", kind: "guest" });
  });
});

describe("own other devices are not another person", () => {
  const receivedAs = (self: string | null, state: Record<string, unknown>) => {
    const { update, clientID } = updateWith(state);
    const b = new Awareness(new Y.Doc());
    applyAwarenessUpdate(b, sanitizeAwarenessUpdate(update, { selfAccount: self }), "remote");
    return b.getStates().get(clientID);
  };
  const me = "acc-me";

  it("a peer on my account is dropped (no avatar, no caret)", () => {
    expect(receivedAs(me, { user: { name: "я", color: "#2E5BDB", kind: "user", account: me }, cursor: { anchor: 1 } })).toBeUndefined();
  });

  it("a stranger and a state without an account (old clients, guests) are shown", () => {
    expect(receivedAs(me, { user: { name: "Аня", color: "#D2453B", kind: "user", account: "acc-anya" } })).toEqual({ user: { name: "Аня", color: "#D2453B", kind: "user", account: "acc-anya" } });
    expect(receivedAs(me, { user: { name: "Старый", color: "#3E8E5A", kind: "user" } })).toEqual({ user: { name: "Старый", color: "#3E8E5A", kind: "user" } });
    // Without a known own account (a guest) nobody is dropped.
    expect(receivedAs(null, { user: { name: "я", color: "#2E5BDB", kind: "user", account: me } })?.user).toMatchObject({ account: me });
  });

  it("a device of mine that was shown before (e.g. an old state) disappears when its account arrives", () => {
    const a = new Awareness(new Y.Doc());
    const b = new Awareness(new Y.Doc());
    a.setLocalState({ user: { name: "я", color: "#2E5BDB", kind: "user" } });
    applyAwarenessUpdate(b, sanitizeAwarenessUpdate(encodeAwarenessUpdate(a, [a.clientID]), { selfAccount: me }), "remote");
    expect(b.getStates().has(a.clientID)).toBe(true);
    a.setLocalStateField("user", { name: "я", color: "#2E5BDB", kind: "user", account: me });
    applyAwarenessUpdate(b, sanitizeAwarenessUpdate(encodeAwarenessUpdate(a, [a.clientID]), { selfAccount: me }), "remote");
    expect(b.getStates().has(a.clientID)).toBe(false);
  });
});
