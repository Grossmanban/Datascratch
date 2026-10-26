import { expect, test } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

test("spaces: «Все документы» shows only this space; tabs from another space are marked; same names are told apart", async ({ page }) => {
  await signUp(page, uniqueEmail("spaces"));
  await newDoc(page, "Документ первого пространства", "Текст");
  const tab = page.getByTestId("sidebar").getByRole("link", { name: /Документ первого пространства/ });
  await expect(tab).toBeVisible();
  await expect(tab.getByTestId("other-space-mark")).toHaveCount(0);

  // A second space (with its own notebook) becomes the active one.
  await page.getByTestId("space-switcher").click();
  await page.getByRole("menuitem", { name: "Новое пространство" }).click();
  await page.getByTestId("sidebar").getByRole("link", { name: "Все документы" }).click();
  await expect(page.getByTestId("space-switcher")).toContainText("Новое пространство");
  await expect(page.getByText("Здесь пока пусто")).toBeVisible();
  await expect(page.getByTestId("doc-card")).toHaveCount(0);
  // The open tab belongs to the first space: still listed, but marked.
  await expect(tab.getByTestId("other-space-mark")).toBeVisible();

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
