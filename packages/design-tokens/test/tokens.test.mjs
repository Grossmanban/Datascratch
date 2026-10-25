import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { contrast, parseHex, toHex, springToCss, darkInk } from "../scripts/lib.mjs";
import { resolve, renderCss, renderSwift } from "../scripts/generate.mjs";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(readFileSync(join(pkg, "tokens.json"), "utf8"));
const t = resolve(raw);

// Names from docs/architecture/contracts/design-tokens.md (v1). Renaming = contract change.
const CONTRACT = {
  color: ["bg.canvas", "bg.surface", "bg.sidebar", "bg.elevated", "text.primary", "text.secondary", "text.tertiary", "line.separator", "accent", "danger", "success", "warning"],
  ink: ["black", "blue", "red", "green", "purple", "brown"],
  highlight: ["yellow", "green", "pink", "blue"],
  tint: ["red", "orange", "yellow", "green", "teal", "blue", "indigo", "purple", "pink", "gray"],
  backdrop: ["sand", "dusk", "mist", "meadow", "ember"],
  type: ["title", "h1", "h2", "h3", "body", "callout", "footnote", "caption"],
  radius: ["sm", "md", "lg", "xl", "full"],
  shadow: ["card", "popover"],
  width: ["normal", "wide", "full"],
  motion: ["snappy", "smooth", "gentle"],
  duration: ["fast", "base", "slow"],
};

test("token names match the contract", () => {
  for (const [group, names] of Object.entries(CONTRACT)) {
    assert.deepEqual(Object.keys(t[group]).sort(), [...names].sort(), group);
  }
  assert.deepEqual(Object.keys(t.space), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  for (const k of Object.keys(t.space)) assert.equal(t.space[k], Number(k) * 4);
});

test("contract values that are fixed by the type scale", () => {
  const sizes = Object.fromEntries(Object.entries(t.type).map(([k, v]) => [k, v.size]));
  assert.deepEqual(sizes, { title: 34, h1: 28, h2: 22, h3: 19, body: 17, callout: 16, footnote: 13, caption: 12 });
  for (const v of Object.values(t.type)) assert.equal(v.lineHeight, v.font === "display" ? 1.2 : 1.5);
});

test("text is legible on paper in both themes (WCAG)", () => {
  for (const theme of ["light", "dark"]) {
    const bg = t.color["bg.canvas"][theme];
    assert.ok(contrast(t.color["text.primary"][theme], bg) >= 12, `primary ${theme}`);
    assert.ok(contrast(t.color["text.secondary"][theme], bg) >= 4.5, `secondary ${theme}`);
    assert.ok(contrast(t.color.accent[theme], bg) >= 4.5, `accent ${theme}`);
    assert.ok(contrast(t.color.danger[theme], bg) >= 3, `danger ${theme}`);
    for (const [name, tint] of Object.entries(t.tint)) {
      assert.ok(contrast(tint.fg[theme], tint.bg[theme]) >= 3, `tint ${name} ${theme}`);
    }
  }
});

test("labels on filled accent read in both themes", () => {
  // UI uses white on light accent and canvas ink on the (light) dark-theme accent.
  assert.ok(contrast("#FFFFFF", t.color.accent.light) >= 4.5);
  assert.ok(contrast(t.color["bg.canvas"].dark, t.color.accent.dark) >= 4.5);
  assert.ok(contrast(t.color["bg.canvas"].dark, t.color.danger.dark) >= 4.5);
});

test("dark inks are lighter and readable on graphite", () => {
  for (const [name, ink] of Object.entries(t.ink)) {
    assert.ok(contrast(ink.dark, t.color["bg.surface"].dark) >= 4.5, name);
  }
  assert.equal(darkInk("#1D1C1A", "#ECE9E3"), "#ECE9E3");
});

test("hex round-trip", () => {
  for (const h of ["#FAF8F4", "#FFFFFFCC", "#00000000"]) assert.equal(toHex(parseHex(h)), h === "#00000000" ? "#00000000" : h);
});

test("spring easing ends at 1 and starts at 0", () => {
  const { duration, easing } = springToCss({ response: 0.3, damping: 0.85 });
  assert.ok(duration > 200 && duration < 1000);
  assert.match(easing, /^linear\(0, .*, 1\)$/);
});

test("renderers are deterministic and cover every token", () => {
  const css = renderCss(t);
  assert.equal(css, renderCss(t));
  for (const k of CONTRACT.color) assert.ok(css.includes(`--ds-${k.replace(".", "-")}:`), k);
  const swift = renderSwift(t);
  for (const k of CONTRACT.tint) assert.ok(swift.includes(`case ${k} = "${k}"`), k);
});
