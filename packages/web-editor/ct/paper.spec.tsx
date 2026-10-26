import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { PaperEditor } from "./PaperEditor";

/** Every text line box must start on the grid: block content tops relative to the column ≡ 0 (mod pitch). */
async function misalignments(page: Page) {
  return page.evaluate(() => {
    const prose = document.querySelector<HTMLElement>(".ds-prose")!;
    const editor = document.querySelector<HTMLElement>(".ds-editor")!;
    const pitch = parseFloat(getComputedStyle(editor).getPropertyValue("--ds-pitch"));
    const cs = getComputedStyle(prose);
    const origin = prose.getBoundingClientRect().top + parseFloat(cs.paddingTop);
    const bad: string[] = [];
    const sel = ".ds-prose > p, .ds-prose > h2, .ds-prose > h3, .ds-task-body > p, .ds-prose blockquote p, .ds-prose li > p, .ds-callout-content p, .ds-prose pre, .ds-prose td p, .ds-prose th p";
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      const s = getComputedStyle(el);
      const top = el.getBoundingClientRect().top + parseFloat(s.paddingTop) + parseFloat(s.borderTopWidth) - origin;
      const off = ((top % pitch) + pitch) % pitch;
      const d = Math.min(off, pitch - off);
      if (d > 1) bad.push(`${el.tagName}:${(el.textContent ?? "").slice(0, 20)} off ${d.toFixed(1)}`);
    }
    // The first rule sits just under the first body line's baseline.
    const ruleY = parseFloat(getComputedStyle(editor).getPropertyValue("--ds-paper-y"));
    return { pitch, bad, ruleY };
  });
}

async function ready(page: Page) {
  await page.waitForFunction(() => window.__paper?.ready === true);
  await expect(page.locator(".ds-math .katex")).toHaveCount(1);
  await page.waitForTimeout(300);
}

for (const font of ["sans", "serif", "mono"] as const) {
  test(`lines paper: every text line sits on the rules (${font})`, async ({ mount, page }, info) => {
    await mount(<PaperEditor paper="lines" font={font} width={760} />);
    await ready(page);
    const r = await misalignments(page);
    expect(r.pitch).toBeGreaterThanOrEqual(25);
    expect(r.bad).toEqual([]);
    await info.attach(`lines-${font}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  });
}

test("grid paper stays aligned after the column width changes", async ({ mount, page }, info) => {
  const c = await mount(<PaperEditor paper="grid" font="sans" width={900} />);
  await ready(page);
  expect((await misalignments(page)).bad).toEqual([]);
  await c.update(<PaperEditor paper="grid" font="sans" width={520} />);
  await page.waitForTimeout(400);
  expect((await misalignments(page)).bad).toEqual([]);
  await info.attach("grid-narrow", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
});

test("the rule origin is under the first body baseline", async ({ mount, page }) => {
  await mount(<PaperEditor paper="lines" font="sans" width={760} />);
  await ready(page);
  const d = await page.evaluate(() => {
    const editor = document.querySelector<HTMLElement>(".ds-editor")!;
    const root = document.querySelector<HTMLElement>(".ds-editor-root")!;
    const pitch = parseFloat(getComputedStyle(editor).getPropertyValue("--ds-pitch"));
    const ruleY = parseFloat(getComputedStyle(editor).getPropertyValue("--ds-paper-y"));
    // Baseline of "Second paragraph." measured with a range + an inline-block probe placed after the text node.
    const p = [...document.querySelectorAll<HTMLElement>(".ds-prose > p")].find((x) => x.textContent === "Second paragraph.")!;
    const range = document.createRange();
    range.selectNodeContents(p);
    const rect = range.getBoundingClientRect();
    const lineTop = p.getBoundingClientRect().top - root.getBoundingClientRect().top;
    const rowRule = lineTop + (((ruleY - lineTop) % pitch) + pitch) % pitch;
    return { textBottom: rect.bottom - root.getBoundingClientRect().top, rowRule, pitch };
  });
  // The rule of this row lies between the baseline and the descenders (bottom of the text box).
  expect(d.rowRule).toBeLessThanOrEqual(d.textBottom + 1);
  expect(d.textBottom - d.rowRule).toBeLessThan(d.pitch / 3);
});
