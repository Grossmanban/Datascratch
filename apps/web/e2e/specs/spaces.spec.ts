import { expect, test, type Page } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

async function switchSpace(page: Page, name: RegExp | string) {
  await page.getByTestId("space-switcher").click();
  await page.getByRole("menuitem", { name }).first().click(); // spaces are listed before «Новое пространство»
}

test("spaces are isolated (D-48): a starred note and a tab of one space are not shown in another and come back", async ({ page }) => {
  await signUp(page, uniqueEmail("spaces"));
  await newDoc(page, "Рабочий план", "Текст");
  const noteUrl = page.url();
  await page.getByRole("button", { name: "В избранное" }).click();
  const sidebar = page.getByTestId("sidebar");
  const inSidebar = sidebar.getByRole("link", { name: /Рабочий план/ });
  await expect(inSidebar).toHaveCount(2); // tab + starred

  // A second space (with its own notebook) becomes the active one: nothing of the first is shown.
  await page.getByTestId("space-switcher").click();
  await page.getByRole("menuitem", { name: "Новое пространство" }).click();
  await expect(page.getByTestId("space-switcher")).toContainText("Новое пространство");
  await expect(page).toHaveURL(/\/all$/);
  await expect(inSidebar).toHaveCount(0);
  await expect(page.getByText("Здесь пока пусто")).toBeVisible();
  await expect(page.getByTestId("doc-card")).toHaveCount(0);
  await page.goto("/starred");
  await expect(page.getByTestId("space-switcher")).toContainText("Новое пространство");
  await expect(page.getByText(/Отмечайте важное звёздочкой/)).toBeVisible();
  await expect(page.getByTestId("doc-card")).toHaveCount(0);
  // Search covers the current space only.
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByTestId("palette-input").fill("Рабочий");
  await expect(page.getByRole("option", { name: /Рабочий план/ })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // A document of the second space has its own tab.
  await newDoc(page, "Личный список");
  await expect(sidebar.getByRole("link", { name: /Личный список/ })).toHaveCount(1);
  await expect(inSidebar).toHaveCount(0);

  // Back in the first space: its tab (opened again) and its starred note return; the other's tab hides.
  await switchSpace(page, /Личное/);
  await expect(page).toHaveURL(noteUrl);
  await expect(page.locator(".ds-prose")).toContainText("Рабочий план");
  await expect(inSidebar).toHaveCount(2);
  await expect(sidebar.getByRole("link", { name: /Личный список/ })).toHaveCount(0);

  // A link to a document of the other space (older links) opens it and switches to its space.
  await switchSpace(page, /Новое пространство/);
  await expect(page.locator(".ds-prose")).toContainText("Личный список");
  await page.goto(noteUrl);
  await expect(page.locator(".ds-prose")).toContainText("Рабочий план");
  await expect(page.getByTestId("space-switcher")).toContainText("Личное");
});

test("spaces with the same name are told apart by their document count", async ({ page }) => {
  await signUp(page, uniqueEmail("spaces-names"));
  await newDoc(page, "Документ", "Текст");
  await page.getByTestId("space-switcher").click();
  await page.getByRole("menuitem", { name: "Новое пространство" }).click();
  await expect(page.getByTestId("space-switcher")).toContainText("Новое пространство");

  // Two spaces with the same name (e.g. migrated from iOS): the switcher shows document counts.
  await expect.poll(() => page.evaluate(() => "__ds" in window)).toBe(true);
  await page.evaluate(() => {
    type YMap = { get(k: string): unknown; set(k: string, v: unknown): void; forEach(f: (v: YMap) => void): void };
    const rt = (window as unknown as { __ds: { store: { docs: Map<string, { getMap(n: string): YMap }>; rows: Map<string, { kind: string }> } } }).__ds;
    const [, account] = [...rt.store.docs].find(([id]) => rt.store.rows.get(id)?.kind === "account")!;
    account.getMap("spaces").forEach((s) => s.set("name", "Личное"));
  });
  await page.getByTestId("space-switcher").click();
  await expect(page.getByRole("menuitem", { name: /^Личное · \d+ документ/ })).toHaveCount(2);
});
