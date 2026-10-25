import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

/**
 * Large visible surfaces whose background does not match the theme (a light panel in the dark
 * theme or the reverse) — i.e. a component that did not switch with the theme.
 */
function staleSurfaces(page: Page, theme: "light" | "dark") {
  return page.evaluate((theme) => {
    const lum = (c: string) => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
      if (!m || (m[4] !== undefined && Number(m[4]) < 0.5)) return null;
      const [r, g, b] = [m[1], m[2], m[3]].map((v) => Number(v) / 255);
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    // Accent fills (buttons, the selected day) are meant to stand out in either theme.
    const probe = document.createElement("div");
    probe.style.background = "var(--ds-accent)";
    document.body.appendChild(probe);
    const accent = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      if (el.closest("img,svg,[data-testid=doc-cover],.ds-swatch,.ds-palette-tool,canvas")) continue;
      const r = el.getBoundingClientRect();
      if (r.width * r.height < 4000 || r.bottom < 0 || r.top > innerHeight) continue;
      const bg = getComputedStyle(el).backgroundColor;
      if (bg === accent) continue;
      const l = lum(bg);
      if (l === null) continue;
      if (theme === "dark" ? l > 0.6 : l < 0.25) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} (${Math.round(l * 100)}%)`);
    }
    return out.slice(0, 5);
  }, theme);
}

test("the theme switches instantly on every screen", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ colorScheme: "light" });
  await signUp(page, uniqueEmail("theme"));
  await newDoc(page, "Тема", "Текст");
  const docUrl = page.url();
  for (const path of ["/all", "/tasks", "/calendar", "/settings/appearance", new URL(docUrl).pathname]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    for (const theme of ["dark", "light"] as const) {
      await page.keyboard.press("Control+Shift+L");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      // Two frames: whatever has not switched by then is stuck.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      expect(await staleSurfaces(page, theme), `${path} in ${theme}`).toEqual([]);
    }
  }
});

test("dialogs and menus meet contrast in the dark theme", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ colorScheme: "dark" });
  await signUp(page, uniqueEmail("theme-dialogs"));
  const check = async (what: string) => {
    // Let opening animations finish: axe measures what is on screen.
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, { timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    const res = await new AxeBuilder({ page }).exclude("[data-swipe-direction]").withTags(["wcag2aa"]).withRules(["color-contrast", "button-name"]).analyze();
    const bad = res.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1] ?? ""}`));
    expect(bad, what).toEqual([]);
  };
  await page.getByRole("button", { name: "New notebook" }).or(page.getByRole("button", { name: "Новый блокнот" })).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await check("new notebook dialog");
  await page.keyboard.press("Escape");
  await page.getByTestId("doc-card").first().click();
  await expect(page.locator(".ds-prose")).toBeVisible();
  await page.getByTestId("share-button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await check("share dialog");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Ещё|More/ }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await check("document menu");
  await page.getByRole("menuitem", { name: /Обложка…|Cover…/ }).click();
  await expect(page.getByTestId("cover-drop")).toBeVisible();
  await check("cover dialog");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await expect(page.getByTestId("palette-input")).toBeVisible();
  await check("command palette");
});
