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
  color: [
    "bg.canvas",
    "bg.surface",
    "bg.sidebar",
    "bg.elevated",
    "text.primary",
    "text.secondary",
    "text.tertiary",
    "text.onAccent",
    "line.separator",
    "accent",
    "danger",
    "success",
    "warning",
  ],
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
  assert.deepEqual(sizes, {
    title: 34,
    h1: 28,
    h2: 22,
    h3: 19,
    body: 17,
    callout: 16,
    footnote: 13,
    caption: 12,
  });
  for (const v of Object.values(t.type))
    assert.equal(v.lineHeight, v.font === "display" ? 1.2 : 1.5);
});

// WCAG AA matrix: every colour used for text against every surface it sits on.
// Surfaces: canvas, surface, sidebar and the elevated glass (as solid). Soft chip
// backgrounds are the colour mixed 14 % into canvas/surface (bg-accent-soft & co.).
const mix = (fg, bg, p) => {
  const a = parseHex(fg);
  const b = parseHex(bg);
  return toHex({
    r: a.r * p + b.r * (1 - p),
    g: a.g * p + b.g * (1 - p),
    b: a.b * p + b.b * (1 - p),
  });
};
const surfaces = (theme) => [
  ...["bg.canvas", "bg.surface", "bg.sidebar"].map((k) => t.color[k][theme]),
  t.color["bg.elevated"][theme].slice(0, 7),
];
const AA = 4.5;

for (const theme of ["light", "dark"]) {
  test(`text contrast ≥ AA on every surface (${theme})`, () => {
    const failures = [];
    const check = (name, fg, bg, min) => {
      const c = contrast(fg, bg);
      if (c < min) failures.push(`${name} ${fg} on ${bg}: ${c.toFixed(2)} < ${min}`);
    };
    for (const bg of surfaces(theme)) {
      check("text.primary", t.color["text.primary"][theme], bg, 12);
      check("text.secondary", t.color["text.secondary"][theme], bg, 6);
      check("text.tertiary", t.color["text.tertiary"][theme], bg, AA);
      for (const k of ["accent", "danger", "success", "warning"])
        check(k, t.color[k][theme], bg, AA);
    }
    for (const bg of surfaces(theme).slice(0, 2)) {
      for (const k of ["accent", "danger", "success", "warning"]) {
        check(`${k} on soft`, t.color[k][theme], mix(t.color[k][theme], bg, 0.14), AA);
      }
    }
    for (const [name, tint] of Object.entries(t.tint)) {
      check(`tint.${name} on its bg`, tint.fg[theme], tint.bg[theme], AA);
      for (const bg of surfaces(theme).slice(0, 2)) check(`tint.${name}`, tint.fg[theme], bg, AA);
    }
    assert.deepEqual(failures, []);
  });

  test(`text hierarchy is preserved (${theme})`, () => {
    const bg = t.color["bg.canvas"][theme];
    const [p, s, q] = ["text.primary", "text.secondary", "text.tertiary"].map((k) =>
      contrast(t.color[k][theme], bg),
    );
    assert.ok(
      p > s + 3 && s > q + 1,
      `primary ${p.toFixed(2)} > secondary ${s.toFixed(2)} > tertiary ${q.toFixed(2)}`,
    );
  });
}

test("labels on filled accent read in both themes", () => {
  // UI uses white on light accent and canvas ink on the (light) dark-theme accent.
  for (const theme of ["light", "dark"]) {
    const on = t.color["text.onAccent"][theme];
    assert.ok(contrast(on, t.color.accent[theme]) >= 4.5, `accent ${theme}`);
    assert.ok(
      contrast(on, t.color.danger[theme]) >= (theme === "light" ? 3 : 4.5),
      `danger ${theme}`,
    );
  }
});

test("dark inks are lighter and readable on graphite", () => {
  for (const [name, ink] of Object.entries(t.ink)) {
    assert.ok(contrast(ink.dark, t.color["bg.surface"].dark) >= 4.5, name);
  }
  assert.equal(darkInk("#1D1C1A", "#ECE9E3"), "#ECE9E3");
});

test("hex round-trip", () => {
  for (const h of ["#FAF8F4", "#FFFFFFCC", "#00000000"])
    assert.equal(toHex(parseHex(h)), h === "#00000000" ? "#00000000" : h);
});

test("spring easing ends at 1 and starts at 0", () => {
  const { duration, easing } = springToCss({ response: 0.3, damping: 0.85 });
  assert.ok(duration > 200 && duration < 1000);
  assert.match(easing, /^linear\(0, .*, 1\)$/);
});

test("renderers are deterministic and cover every token", () => {
  const css = renderCss(t);
  assert.equal(css, renderCss(t));
  for (const k of CONTRACT.color)
    assert.ok(
      css.includes(
        `--ds-${k
          .replace(".", "-")
          .replace(/([a-z])([A-Z])/g, "$1-$2")
          .toLowerCase()}:`,
      ),
      k,
    );
  const swift = renderSwift(t);
  for (const k of CONTRACT.tint) assert.ok(swift.includes(`case ${k} = "${k}"`), k);
});
