import { expect, test } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

// The preview server sends the production security headers (src/lib/securityHeaders.ts);
// no screen may trip the Content Security Policy.
test("the app runs under the production CSP without violations", async ({ page }) => {
  const res = await page.goto("/login");
  const headers = res!.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  const violations: string[] = [];
  const collect = async () => violations.push(...(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])));

  await signUp(page, uniqueEmail("csp"));
  await collect();
  await newDoc(page, "Под CSP", "Формула и рисунок");
  await page.waitForTimeout(1000);
  await collect();
  for (const path of ["/tasks", "/calendar", "/settings/account", "/settings/appearance"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await collect();
  }
  // The theme is applied before paint by /theme-init.js (no inline script).
  expect(await page.locator("html").getAttribute("data-theme")).toMatch(/light|dark/);
  expect(violations).toEqual([]);
});
