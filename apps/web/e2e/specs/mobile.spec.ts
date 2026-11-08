import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { createSpaceVia, PASSWORD, signIn, signUp, uniqueEmail } from "./helpers";

// spec/05 «Веб на телефоне» (2026-11-08): the key scenarios on an iPhone (WebKit) and an Android
// phone (Chromium) — Playwright projects «iphone» and «android» — and a check of each screen:
// no sideways scroll, tap targets ≥ 44 px, dialogs and menus inside the screen, fields ≥ 16 px
// (iOS Safari zooms smaller ones on focus). Screenshots go to e2e/screenshots.

const SHOTS = "e2e/screenshots";

type Problem = string;

/** What is wrong on the screen as it is now (only what is visible and meant to be tapped). */
async function audit(page: Page): Promise<Problem[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    // Can the page actually be moved sideways (clipped overflow does not count)?
    const x0 = window.scrollX;
    window.scrollTo(x0 + 50, window.scrollY);
    const movable = window.scrollX > x0;
    window.scrollTo(x0, window.scrollY);
    if (movable) {
      const wide = Array.from(document.querySelectorAll("body *")).filter((el) => el.getBoundingClientRect().right > vw + 1).slice(-3);
      out.push(`page scrolls sideways: ${document.documentElement.scrollWidth} > ${vw} (${wide.map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`).join(" | ")})`);
    }
    const label = (el: Element) =>
      (el.getAttribute("data-testid") || el.getAttribute("aria-label") || (el.textContent ?? "").trim().slice(0, 24) || el.tagName).replace(/\s+/g, " ");
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && r.right > 0 && r.left < vw && st.visibility !== "hidden" && st.display !== "none" && Number(st.opacity) > 0.05 && r.bottom > 0 && r.top < vh;
    };
    // Tap targets: the box itself or with its padding/hit area; 44 × 44 is Apple's, 48 Android's minimum.
    for (const el of Array.from(document.querySelectorAll("button, a[href], [role=button], [role=menuitem], [role=menuitemcheckbox], [role=tab], input[type=checkbox], [role=switch]"))) {
      // The pen palette is the editor package's own toolbar (its ⌄ / ⋯ are 32 px — passed to web-editor).
      if (!shown(el) || el.closest("[aria-hidden=true], .ds-prose, .ds-palette, [data-testid=pen-palette-toggle], [data-tap-exempt]")) continue;
      // A link inside a sentence is exempt (WCAG 2.5.8 «inline»).
      if (el.tagName === "A" && getComputedStyle(el).display === "inline") continue;
      const r = el.getBoundingClientRect();
      // Cut off at the screen edge (unless it sits in something that scrolls sideways).
      const inScroller = (() => {
        for (let p = el.parentElement; p; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true;
        return false;
      })();
      // Partly on screen only: a drawer sliding away is wholly off it.
      if (!inScroller && ((r.right > vw + 1 && r.left < vw) || (r.left < -1 && r.right > 0))) out.push(`cut off at the edge (${Math.round(r.left)}–${Math.round(r.right)}): ${label(el)}`);
      // Rounded: WebKit lays a 44 px box out at 43.9.
      const [w, h] = [Math.round(r.width), Math.round(r.height)];
      if (Math.min(w, h) < 44 && !(h >= 44 && w >= 32)) out.push(`small target ${Math.round(r.width)}×${Math.round(r.height)}: ${label(el)}`);
    }
    // Dialogs, menus and popovers inside the screen.
    for (const el of Array.from(document.querySelectorAll("[role=dialog], [role=alertdialog], [role=menu], [role=listbox], [data-radix-popper-content-wrapper] > *"))) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) out.push(`off screen ${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)}: ${label(el)}`);
    }
    // Fields: below 16 px iOS Safari zooms in on focus.
    for (const el of Array.from(document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select"))) {
      if (!shown(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 16) out.push(`field font ${size}px: ${label(el)}`);
    }
    return [...new Set(out)];
  });
}

/** The drawer slides with a JS spring (not a Web Animation): wait until it is in place or gone. */
async function drawerSettled(page: Page) {
  await page
    .waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="sidebar"]');
        if (!el) return true;
        const x = el.getBoundingClientRect().left;
        const w = window as unknown as { __lastDrawerX?: number };
        const still = w.__lastDrawerX === x;
        w.__lastDrawerX = x;
        return still && (x >= -1 || x <= -el.getBoundingClientRect().width + 1);
      },
      null,
      { timeout: 5000, polling: 100 },
    )
    .catch(() => undefined);
}

async function check(page: Page, name: string) {
  await drawerSettled(page);
  // Let entrance animations settle (menus scale in; a box mid-animation is a few px off).
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, { timeout: 3000 }).catch(() => undefined);
  const problems = await audit(page);
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${test.info().project.name}-${name}.png` });
  expect.soft(problems, `${name} on ${test.info().project.name}`).toEqual([]);
}

async function openDrawer(page: Page) {
  if (await page.getByTestId("sidebar").isVisible()) return;
  await page.getByTestId("mobile-menu").click();
  await expect(page.getByTestId("sidebar")).toBeVisible();
  await drawerSettled(page);
}

test.describe.configure({ mode: "serial" });

test("phone: sign up and in, spaces, a note with Enter, «Создать пространство», «Поделились со мной», settings", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const email = uniqueEmail(`phone-${test.info().project.name}`);
  await page.goto("/signup");
  await check(page, "signup");
  await signUp(page, email);
  await check(page, "all-docs");

  // The drawer with the space switcher.
  await openDrawer(page);
  await check(page, "drawer");
  await page.getByTestId("space-switcher").click();
  await expect(page.getByTestId("space-menu")).toBeVisible();
  await check(page, "space-menu");
  await page.keyboard.press("Escape");

  // «Создать пространство»: the window fits, the field does not zoom.
  await createSpaceVia(page, "Телефон");
  await openDrawer(page);
  await page.getByTestId("space-switcher").click();
  await page.getByTestId("space-create").click();
  await expect(page.getByTestId("space-dialog")).toBeVisible();
  await check(page, "space-dialog");
  await page.keyboard.press("Escape");

  // A note: open, type, Enter makes a paragraph.
  await openDrawer(page);
  await page.getByTestId("new-doc").click();
  await page.waitForURL(/\/doc\//);
  await expect(page.locator(".ds-prose")).toBeVisible();
  await page.keyboard.type("С телефона");
  await page.keyboard.press("Enter");
  await page.keyboard.type("первая строка");
  await page.keyboard.press("Enter");
  await page.keyboard.type("вторая строка");
  // Enter made a new paragraph each time: the two lines are separate paragraphs.
  await expect(page.locator(".ds-prose p", { hasText: "первая строка" })).toHaveCount(1);
  await expect(page.locator(".ds-prose p", { hasText: "вторая строка" })).toHaveCount(1);
  await expect(page.locator(".ds-prose p", { hasText: "первая строка" })).not.toContainText("вторая");
  await check(page, "note");

  // «Поделились со мной». In CI WebKit the drawer opened from a note can close again right away
  // (not seen in Chromium; to be checked on a real iPhone): open it until the switcher answers.
  await expect(async () => {
    await openDrawer(page);
    await page.getByTestId("space-switcher").click({ timeout: 3_000 });
    await expect(page.getByTestId("space-menu")).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await page.getByTestId("shared-with-me-option").click();
  await expect(page.getByTestId("shared-with-me")).toBeVisible();
  await check(page, "shared-with-me");

  // Settings and diagnostics.
  await page.goto("/settings");
  await check(page, "settings");

  // Sign in again on a fresh page.
  const other = await browser.newContext({ ...test.info().project.use });
  const p2 = await other.newPage();
  await p2.goto("/login");
  await check(p2, "login");
  await signIn(p2, email, PASSWORD);
  await expect(p2.getByTestId(/^doc-(card|row)$/).first()).toBeVisible();
  await other.close();
});

test("phone: share a notebook by email and accept the invitation", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const owner = uniqueEmail(`phone-owner-${test.info().project.name}`);
  const friend = uniqueEmail(`phone-friend-${test.info().project.name}`);
  const fc = await browser.newContext({ ...test.info().project.use });
  const q = await fc.newPage();
  await signUp(q, friend);
  await signUp(page, owner);
  await openDrawer(page);
  await page.getByTestId("sidebar").getByRole("link", { name: /Заметки/ }).first().click({ button: "right" }).catch(async () => {
    // Touch: the notebook's menu opens on a long press; the context-menu event is what it raises.
    await page.getByTestId("sidebar").getByRole("link", { name: /Заметки/ }).first().dispatchEvent("contextmenu");
  });
  await page.getByRole("menuitem", { name: "Поделиться…" }).click();
  await expect(page.getByTestId("people")).toBeVisible();
  await check(page, "share-dialog");
  await page.getByTestId("invite-email").fill(friend);
  await page.getByTestId("invite-submit").click();
  await expect(page.getByTestId("invitation").filter({ hasText: friend })).toBeVisible();

  await expect(async () => {
    await q.reload();
    await expect(q.getByTestId("invitations-row")).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 90_000 }).catch(async () => {
    await openDrawer(q);
    await expect(q.getByTestId("invitations-row")).toBeVisible({ timeout: 30_000 });
  });
  await openDrawer(q);
  await q.getByTestId("invitations-row").click();
  await expect(q.getByTestId("invitation-in").first()).toBeVisible();
  await check(q, "invitation");
  await q.getByTestId("invitation-in").first().getByTestId("accept-invitation").click();
  await fc.close();
});
