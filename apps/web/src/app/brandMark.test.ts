import { tokens } from "@datascratch/design-tokens";
import { describe, expect, it } from "vitest";
import { MARK_INK, MARK_STROKE } from "./brandMark";
import html from "../../index.html?raw";

// The boot screen in index.html is drawn before any module loads, so it repeats the mark's
// paths and four token colours. These copies must not drift from their sources.
const style = html.slice(html.indexOf("<style>"), html.indexOf("</style>")).toLowerCase();

describe("boot screen (index.html)", () => {
  it("draws the same mark as the app", () => {
    expect(html.split(`d="${MARK_INK}"`).length - 1).toBe(2); // the ink and its wet sheen
    expect(html).toContain(`d="${MARK_STROKE}"`); // the pen's reveal
    expect(html).toContain(`offset-path:path("${MARK_STROKE}")`); // the nib's way
  });

  it.each(["light", "dark"] as const)("uses the design tokens' %s colours", (theme) => {
    const c = tokens.color;
    const sel = theme === "dark" ? '[data-theme="dark"] ' : "";
    const rule = (cls: string) => {
      const m = style.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[[\]"=]/g, "\\$&")}\\.${cls}\\{([^}]*)\\}`));
      return m?.[1] ?? "";
    };
    expect(rule("ds-boot-bg")).toContain(c["bg.canvas"][theme].toLowerCase());
    expect(rule("ds-boot-tile")).toContain(c["bg.surface"][theme].toLowerCase());
    expect(rule("ds-boot-edge")).toContain(c["line.separator"][theme].toLowerCase());
    expect(rule("ds-boot-ink")).toContain(c.accent[theme].toLowerCase());
  });
});
