import { expect, test } from "@playwright/test";
import { signUp, uniqueEmail } from "./helpers";

// The selected space's ✓ wrapped under its name (owner's screenshot, 2026-10-26).
test("menu rows: icon | name | ✓ on one line, the check right-aligned and centred, long names ellipsised", async ({ page }) => {
  await signUp(page, uniqueEmail("menu"));
  await page.getByTestId("space-switcher").click();
  await page.getByRole("menuitem", { name: "Новое пространство" }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  // A long name for the current space.
  await expect.poll(() => page.evaluate(() => "__ds" in window)).toBe(true);
  await page.evaluate(() => {
    type YMap = { get(k: string): unknown; set(k: string, v: unknown): void; forEach(f: (v: YMap) => void): void };
    const rt = (window as unknown as { __ds: { store: { docs: Map<string, { getMap(n: string): YMap }>; rows: Map<string, { kind: string }> } } }).__ds;
    const [, account] = [...rt.store.docs].find(([id]) => rt.store.rows.get(id)?.kind === "account")!;
    account.getMap("spaces").forEach((s) => {
      if (s.get("name") === "Новое пространство") s.set("name", "Очень длинное название рабочего пространства для проверки");
    });
  });
  for (const width of [1360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    // On a phone the sidebar (with the switcher) is a drawer.
    if (width < 700) await page.getByTestId("mobile-menu").click();
    await page.getByTestId("space-switcher").click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    const checked = menu.getByRole("menuitem").filter({ has: page.getByTestId("menu-check") });
    await expect(checked).toHaveCount(1);
    const row = (await checked.boundingBox())!;
    const check = (await checked.getByTestId("menu-check").boundingBox())!;
    const name = (await checked.getByTestId("menu-row").locator("span").first().boundingBox())!;
    // Same line, vertically centred, on the right of the name, inside the row.
    expect(Math.abs(check.y + check.height / 2 - (row.y + row.height / 2))).toBeLessThan(3);
    expect(Math.abs(name.y + name.height / 2 - (row.y + row.height / 2))).toBeLessThan(3);
    expect(check.x).toBeGreaterThan(name.x + name.width - 1);
    expect(check.x + check.width).toBeLessThanOrEqual(row.x + row.width);
    expect(row.height).toBeLessThan(44);
    // The other spaces line up with it: the same check column.
    const plain = menu.getByRole("menuitem").filter({ hasText: "Личное" });
    const plainName = (await plain.getByTestId("menu-row").locator("span").first().boundingBox())!;
    expect(Math.abs(plainName.x - name.x)).toBeLessThan(3);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    // The ellipsis keeps the long name on one line.
    expect(name.height).toBeLessThan(24);
  }
});
