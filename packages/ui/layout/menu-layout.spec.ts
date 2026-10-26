import { expect, test } from "@playwright/test";

// Regression: a trailing check / shortcut must stay on the label's line (it used to wrap
// under the name in the space switcher). Every row: one line, label and trailing slot
// vertically centred and side by side, no overflow.
for (const theme of ["light", "dark"] as const) {
  test(`menu rows never wrap (${theme})`, async ({ page }) => {
    await page.goto(`/?story=overlays--space-switcher&mode=preview&theme=${theme}`);
    const items = page.getByRole("menuitem");
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const box = (await item.boundingBox())!;
      expect(box.height, `row ${i} height`).toBeLessThanOrEqual(40);
      const label = (await item.locator("[data-menu-label]").boundingBox())!;
      const slot = item.locator("[data-menu-trailing]");
      const trailing = (await slot.count()) ? await slot.boundingBox() : null;
      if (trailing) {
        expect(
          Math.abs(label.y + label.height / 2 - (trailing.y + trailing.height / 2)),
          `row ${i} centred`,
        ).toBeLessThan(2);
        expect(label.x + label.width, `row ${i} label before trailing`).toBeLessThanOrEqual(
          trailing.x + 0.5,
        );
        expect(trailing.x + trailing.width, `row ${i} trailing inside row`).toBeLessThanOrEqual(
          box.x + box.width + 0.5,
        );
      }
    }
  });
}
