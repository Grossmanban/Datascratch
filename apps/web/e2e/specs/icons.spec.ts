import { expect, test } from "@playwright/test";
import { signUp, uniqueEmail } from "./helpers";

test("icons stored by iOS as SF Symbol names show as emoji, never as their name", async ({ page }) => {
  await signUp(page, uniqueEmail("icons"));
  await expect.poll(() => page.evaluate(() => "__ds" in window)).toBe(true);
  // What the iOS SymbolPicker stores: a space «house», a notebook «book.closed».
  await page.evaluate(() => {
    type YMap = { get(k: string): unknown; set(k: string, v: unknown): void; forEach(f: (v: YMap) => void): void };
    const rt = (window as unknown as { __ds: { store: { docs: Map<string, { getMap(n: string): YMap }>; rows: Map<string, { kind: string }> } } }).__ds;
    const [, account] = [...rt.store.docs].find(([id]) => rt.store.rows.get(id)?.kind === "account")!;
    account.getMap("spaces").forEach((s) => s.set("icon", "house"));
    account.getMap("notebooks").forEach((n) => n.set("icon", "book.closed"));
  });

  await page.goto("/all");
  // Space tile and the crumb above the list.
  await expect(page.locator("body")).toContainText("🏠 ");
  await expect(page.getByTestId("sidebar-panel")).toContainText("📕");
  // The bug: the crumb above the list read «house Личное».
  for (const name of ["house", "book.closed"]) await expect(page.locator("body")).not.toContainText(name);
});
