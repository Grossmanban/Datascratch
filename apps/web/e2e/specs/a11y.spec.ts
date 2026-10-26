import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { extendedScreens, signUp, uniqueEmail } from "./helpers";

/** Serious and critical WCAG 2.1 AA violations on the current page. */
async function violations(page: Page) {
  // axe measures what is on screen: let fade-ins (screen change, empty states) finish first.
  // Toasts ([data-swipe-direction]) animate on their own and go away, so they are left out.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, { timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(400);
  const res = await new AxeBuilder({ page }).exclude("[data-swipe-direction]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return res.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} — ${v.nodes.slice(0, 4).map((n) => `${n.target.join(" ")} ${process.env.A11Y_DEBUG ? `${n.html.slice(0, 160)} ${n.failureSummary?.split("\n").slice(1, 2).join("")}` : ""}`).join(" | ")}`);
}

for (const [scheme, phone] of [["light", false], ["dark", false], ["light", true]] as const) {
  test(`key screens have no serious accessibility violations (${scheme}${phone ? ", phone" : ""})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: scheme });
    if (phone) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    const found: Record<string, string[]> = { login: await violations(page) };
    await signUp(page, uniqueEmail(`a11y-${scheme}${phone ? "-phone" : ""}`));
    for (const path of ["/all", ...extendedScreens(), "/settings"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      found[path] = await violations(page);
    }
    await page.goto("/all");
    await page.getByTestId("doc-card").first().click();
    await expect(page.locator(".ds-prose")).toBeVisible();
    found.doc = await violations(page);
    for (const [k, v] of Object.entries(found)) if (v.length) console.log(`[${scheme}] ${k}:\n  ${v.join("\n  ")}`);
    expect(Object.values(found).flat()).toEqual([]);
  });
}
