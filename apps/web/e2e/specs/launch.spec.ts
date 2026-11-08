import { expect, test, type Page } from "@playwright/test";
import { signUp, uniqueEmail } from "./helpers";

// spec/10 «Запуск»: the ink draws the mark, which flies to its place while the app fades in;
// it never holds the app up, never lets the sign-in screen flash for a signed-in user, and
// with reduced motion it is a plain cross-fade.

type BootLog = { mode: string; start: number; ready: number | null; done: number | null; target: string | null };

/** Records every Web Animation started on the boot screen, and whether the sign-in form ever showed. */
async function watchBoot(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __bootAnims: string[]; __loginSeen: boolean };
    w.__bootAnims = [];
    w.__loginSeen = false;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, frames, opts) {
      if (this.closest?.("#ds-boot") || this.id === "root") {
        const list = Array.isArray(frames) ? frames : [frames ?? {}];
        const props = new Set(list.flatMap((f) => Object.keys(f as object)).filter((k) => !["offset", "easing", "composite"].includes(k)));
        w.__bootAnims.push(`${this.getAttribute("class") || this.id}:${[...props].join(",")}`);
      }
      return animate.call(this, frames, opts);
    };
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="login-form"]')) w.__loginSeen = true;
    }).observe(document, { subtree: true, childList: true });
  });
}

async function bootResult(page: Page) {
  await page.waitForFunction(() => !document.getElementById("ds-boot"), null, { timeout: 20_000 });
  return page.evaluate(() => {
    const w = window as unknown as { __dsBootLog: BootLog; __bootAnims: string[]; __loginSeen: boolean };
    return { log: w.__dsBootLog, anims: w.__bootAnims, loginSeen: w.__loginSeen, boot: document.documentElement.getAttribute("data-boot") };
  });
}

test("cold start: the stroke is drawn, the mark lands on the sign-in logo, within 1.1 s of readiness", async ({ page }) => {
  await watchBoot(page);
  await page.goto("/login");
  const { log, anims, boot } = await bootResult(page);
  expect(log.mode).toBe("draw");
  expect(log.target).toBe("element");
  expect(boot, "the boot attribute is gone with the screen").toBeNull();
  // Drawn with the stroke reveal and the nib; only transform and opacity otherwise.
  expect(anims.some((a) => a.startsWith("ds-boot-pen:") && a.includes("strokeDashoffset"))).toBe(true);
  const props = new Set(anims.flatMap((a) => a.split(":")[1]!.split(",")));
  for (const p of props) expect(["opacity", "transform", "strokeDashoffset", "offsetDistance"]).toContain(p);
  // ≤ 1.1 s when the app is ready in time; never more than a short hand-off after readiness.
  const total = log.done! - log.start;
  const afterReady = log.done! - log.ready!;
  expect(total <= 1100 + 150 || afterReady <= 450, `total ${Math.round(total)} ms, after ready ${Math.round(afterReady)} ms`).toBe(true);
  await expect(page.getByTestId("login-form")).toBeVisible();
  // A reload in the same tab is not a cold start: a quick hand-off without the drawing.
  await page.reload();
  const again = await bootResult(page);
  expect(again.log.mode).toBe("quick");
  expect(again.anims.some((a) => a.startsWith("ds-boot-pen:"))).toBe(false);
});

test("a signed-in start: no sign-in flash, and the mark flies to the sidebar", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ru-RU", viewport: { width: 1360, height: 860 } });
  const first = await ctx.newPage();
  await signUp(first, uniqueEmail("launch"));
  await first.close();
  const page = await ctx.newPage(); // a new tab: a cold start
  await watchBoot(page);
  await page.goto("/all");
  const { log, loginSeen } = await bootResult(page);
  expect(loginSeen, "the sign-in screen must not flash before the session check").toBe(false);
  expect(log.mode).toBe("draw");
  expect(log.target).toBe("element");
  await expect(page.getByTestId("sidebar")).toBeVisible();
  await ctx.close();
});

test("reduced motion: a plain cross-fade, no drawing and no flight", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ru-RU", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await watchBoot(page);
  await page.goto("/login");
  const { log, anims } = await bootResult(page);
  expect(log.mode).toBe("reduced");
  expect(anims.length).toBeGreaterThan(0);
  for (const a of anims) expect(a, "only opacity").toMatch(/:opacity$/);
  await expect(page.getByTestId("login-form")).toBeVisible();
  await ctx.close();
});

test("the boot screen never covers the app: no script, no screen", async ({ page }) => {
  await page.route("**/boot-anim.js", (route) => route.abort());
  await page.goto("/login");
  await expect(page.getByTestId("login-form")).toBeVisible();
  await expect(page.locator("#ds-boot")).toHaveCount(0);
});
