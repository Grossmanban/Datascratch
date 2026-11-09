import { describe, expect, it, vi } from "vitest";

vi.mock("@/data/runtime", () => ({ runtime: () => ({ requestSnapshot: async () => true }) }));

import { createSnapshotPolicy, EDITING_INTERVAL_MS, LEAVE_GAP_MS } from "./snapshots";

const MIN = 60_000;
const settle = () => new Promise((r) => setTimeout(r, 0));

function setup(lastAt = 0) {
  let now = 1_000_000_000;
  const taken: number[] = [];
  const saved = new Map<string, number>([["n", lastAt]]);
  const policy = createSnapshotPolicy({
    snapshot: async () => {
      taken.push(now);
      return true;
    },
    now: () => now,
    load: (id) => saved.get(id) ?? 0,
    save: (id, at) => void saved.set(id, at),
  });
  return {
    policy,
    taken,
    saved,
    tick: (ms: number) => void (now += ms),
    get now() {
      return now;
    },
  };
}

describe("version snapshots (spec/06, the same policy as iOS)", () => {
  it("leaving after one edit: a version when none was taken here yet", async () => {
    const t = setup();
    t.policy.edited("n");
    expect(await t.policy.left("n")).toBe(true);
    expect(t.taken).toHaveLength(1);
    expect(t.saved.get("n")).toBe(t.now);
  });

  it("leaving: not again within 2 minutes of the last one, unless 30+ edits", async () => {
    const t = setup();
    t.policy.edited("n");
    await t.policy.left("n");
    t.tick(LEAVE_GAP_MS - MIN);
    t.policy.edited("n");
    expect(await t.policy.left("n")).toBe(false);
    for (let i = 0; i < 30; i++) t.policy.edited("n");
    expect(await t.policy.left("n")).toBe(true);
    expect(t.taken).toHaveLength(2);
  });

  it("leaving after 2 minutes with an edit; nothing without edits", async () => {
    const t = setup();
    t.policy.edited("n");
    await t.policy.left("n");
    t.tick(LEAVE_GAP_MS);
    expect(await t.policy.left("n")).toBe(false);
    t.policy.edited("n");
    expect(await t.policy.left("n")).toBe(true);
  });

  it("every 10 minutes while editing", async () => {
    const t = setup();
    t.policy.edited("n");
    for (let m = 1; m < 10; m++) {
      t.tick(MIN);
      t.policy.edited("n");
    }
    expect(t.taken).toHaveLength(0);
    t.tick(MIN);
    t.policy.edited("n");
    await settle();
    expect(t.taken).toHaveLength(1);
    // The next one 10 minutes after that.
    t.tick(EDITING_INTERVAL_MS - MIN);
    t.policy.edited("n");
    await settle();
    expect(t.taken).toHaveLength(1);
    t.tick(MIN);
    t.policy.edited("n");
    await settle();
    expect(t.taken).toHaveLength(2);
  });

  it("before «Оформить» or a voice insert: the state before it, once", async () => {
    const t = setup();
    // No version of this note here yet: one before the change even without edits.
    expect(await t.policy.before("n")).toBe(true);
    // Nothing changed since: that version already is the state before.
    expect(await t.policy.before("n")).toBe(false);
    t.policy.edited("n");
    expect(await t.policy.before("n")).toBe(true);
    expect(t.taken).toHaveLength(2);
  });

  it("one upload at a time; a failed one changes nothing", async () => {
    let fail = true;
    const policy = createSnapshotPolicy({
      snapshot: async () => !fail,
      now: () => 5 * EDITING_INTERVAL_MS,
      load: () => 0,
      save: () => undefined,
    });
    policy.edited("n");
    expect(await policy.left("n")).toBe(false);
    expect(policy.state("n").edits).toBe(1);
    fail = false;
    const [a, b] = await Promise.all([policy.left("n"), policy.before("n")]);
    expect([a, b]).toEqual([true, true]);
    expect(policy.state("n").edits).toBe(0);
  });
});
