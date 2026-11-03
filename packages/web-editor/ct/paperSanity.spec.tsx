import { expect, test } from "@playwright/experimental-ct-react";
import { PaperEditor } from "./PaperEditor";

test("sanity: on plain paper (no ruled typesetting) the check finds misaligned lines", async ({ mount, page }) => {
  await mount(<PaperEditor paper="plain" font="sans" width={760} />);
  await page.waitForFunction(() => window.__paper?.ready === true);
  await page.waitForTimeout(300);
  const bad = await page.evaluate(() => {
    const prose = document.querySelector<HTMLElement>(".ds-prose")!;
    const pitch = 26;
    const origin = prose.getBoundingClientRect().top + parseFloat(getComputedStyle(prose).paddingTop);
    return [...document.querySelectorAll<HTMLElement>(".ds-prose > p, .ds-prose > h2, .ds-prose > h3")].filter((el) => {
      const off = (((el.getBoundingClientRect().top - origin) % pitch) + pitch) % pitch;
      return Math.min(off, pitch - off) > 1;
    }).length;
  });
  expect(bad).toBeGreaterThan(0);
});
