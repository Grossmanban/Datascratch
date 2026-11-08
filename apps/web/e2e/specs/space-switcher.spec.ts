import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createSpaceVia, openSharedWithMe, signUp, uniqueEmail } from "./helpers";

// spec/05 «Переключатель пространств и „Создать пространство“» (2026-11-08) and D-63.

const LONG = "Очень длинное название рабочего пространства, которое не помещается в строку";

for (const scheme of ["light", "dark"] as const) {
  test(`switcher and «Создать пространство»: name required, icon and colour, long names, keyboard, edit (${scheme})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: scheme });
    await signUp(page, uniqueEmail(`switcher-${scheme}`));

    // The window: no name — no space; type cards, icon, colour, live preview.
    await page.getByTestId("space-switcher").click();
    await page.getByTestId("space-create").click();
    const dialog = page.getByTestId("space-dialog");
    await expect(page.getByTestId("space-name")).toBeFocused();
    await expect(page.getByTestId("space-submit")).toBeDisabled();
    await expect(page.getByTestId("space-kind-personal")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("space-name").fill("   ");
    await expect(page.getByTestId("space-submit")).toBeDisabled();
    await page.getByTestId("space-name").fill(LONG);
    await page.getByTestId("space-icons").getByRole("radio", { name: "🎓" }).click();
    await page.getByTestId("space-colors").getByRole("radio", { name: "Зелёный" }).click();
    await expect(page.getByTestId("space-preview")).toContainText("🎓");
    await expect(page.getByTestId("space-preview")).toContainText(LONG.slice(0, 20));
    const axe = await new AxeBuilder({ page }).include("[role=dialog]").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
    await page.getByTestId("space-submit").click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId("space-switcher")).toContainText("Очень длинное");

    // The long name: one line in the switcher and in its row, the whole of it in a tooltip.
    const trigger = page.getByTestId("space-switcher");
    expect((await trigger.boundingBox())!.height).toBeLessThan(40);
    await trigger.click();
    const menu = page.getByTestId("space-menu");
    await expect(menu).toBeVisible();
    const row = menu.getByTestId("space-option").filter({ hasText: "Очень длинное" });
    expect((await row.boundingBox())!.height).toBeLessThan(44);
    await row.locator("[data-menu-label] span").first().hover();
    await expect(page.getByTestId("space-name-tooltip")).toHaveText(LONG);
    // A short name gets no tooltip.
    await menu.getByTestId("space-option").filter({ hasText: "Личное" }).locator("[data-menu-label] span").first().hover();
    await page.waitForTimeout(600);
    await expect(page.getByTestId("space-name-tooltip")).toHaveCount(0);

    // Keyboard: ↑↓ move, Enter picks, Esc closes.
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByTestId("space-option").filter({ hasText: "Очень длинное" })).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(menu.getByTestId("space-option").filter({ hasText: "Личное" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toContainText("Личное");

    // Edit in the same window, from «Настройки пространства»: the name and icon change.
    await trigger.click();
    await page.getByTestId("space-settings").click();
    await expect(page.getByRole("dialog")).toContainText("Настройки пространства");
    await expect(page.getByTestId("space-kind-personal")).toHaveCount(0);
    await expect(page.getByTestId("space-name")).toHaveValue("Личное");
    await page.getByTestId("space-name").fill("Дом");
    await page.getByTestId("space-icons").getByRole("radio", { name: "🏡" }).click();
    await page.getByTestId("space-submit").click();
    await expect(trigger).toContainText("Дом");
    await expect(trigger).toContainText("🏡");

    // …and from the right-click menu of a space in the switcher.
    await trigger.click();
    await menu.getByTestId("space-option").filter({ hasText: "Очень длинное" }).click({ button: "right" });
    // The switcher closes; the space's actions open where the click was.
    await expect(menu).toHaveCount(0);
    await expect(page.getByRole("menu")).toHaveCount(1);
    await page.getByRole("menu").getByRole("menuitem", { name: "Настройки пространства" }).click();
    await expect(page.getByTestId("space-name")).toHaveValue(LONG);
    await page.getByTestId("space-name").fill("Учёба");
    await page.getByTestId("space-submit").click();
    await trigger.click();
    await expect(menu.getByTestId("space-option").filter({ hasText: "Учёба" })).toBeVisible();
    await page.keyboard.press("Escape");

    // D-63: «Поделились со мной» is its own section — empty here.
    await openSharedWithMe(page);
    await expect(page.getByTestId("shared-with-me")).toContainText("Пока ничего нет");
    await expect(trigger).toContainText("Поделились со мной");
    await expect(page.getByTestId("new-doc")).toHaveCount(0);
  });
}

test("a shared space is created with a name and icon and goes on to «Пригласить людей»", async ({ page }) => {
  await signUp(page, uniqueEmail("switcher-shared"));
  await createSpaceVia(page, "Команда", { shared: true, icon: "🎯" });
  await expect(page.getByTestId("space-invite-step")).toContainText("Пригласите людей по почте");
  await page.getByTestId("space-invite-skip").click();
  await expect(page.getByTestId("space-invite-step")).toHaveCount(0);
  await expect(page.getByTestId("space-switcher")).toContainText("🎯");
  await page.getByTestId("space-switcher").click();
  await expect(page.getByTestId("space-menu")).toContainText("Общие");
  await expect(page.getByTestId("space-option").filter({ hasText: "Команда" })).toHaveAttribute("data-current", "true");
});
