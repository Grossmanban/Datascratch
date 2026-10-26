import { expect, test } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

test("the sidebar section is «Блокноты»: notebooks with their folder tree (agent folders, nesting, new folder, drag a note in)", async ({ page }) => {
  await signUp(page, uniqueEmail("folders"));
  const sidebar = page.getByTestId("sidebar");
  await expect(sidebar.getByText("Блокноты", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("Папки", { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => "__dsTest" in window)).toBe(true);
  // No folders yet: no chevron to unfold the notebook (nothing would appear).
  const notebookChevron = sidebar.getByRole("button", { name: /(Развернуть|Свернуть) «Заметки»/ });
  await expect(notebookChevron).toHaveCount(0);

  // Folders as an agent's create_folder writes them into the notebook index (document-model §3).
  await page.evaluate(() => {
    type YMap = { set(k: string, v: unknown): void };
    type T = { Y: { Map: new () => YMap } };
    const w = window as unknown as { __dsTest: T; __ds: { store: { docs: Map<string, { getMap(n: string): YMap; transact(f: () => void): void }>; rows: Map<string, { kind: string }> } } };
    const [, nb] = [...w.__ds.store.docs].find(([id]) => w.__ds.store.rows.get(id)?.kind === "notebook")!;
    const folder = (id: string, parentId: string | null, name: string, order: number) => {
      const m = new w.__dsTest.Y.Map();
      nb.getMap("folders").set(id, m);
      for (const [k, v] of Object.entries({ id, parentId, name, icon: null, color: "tint.blue", order, createdAt: new Date().toISOString() })) m.set(k, v);
    };
    nb.transact(() => {
      folder("01a1aaaa-0000-7000-8000-000000000001", null, "Проекты", 1);
      folder("01a1aaaa-0000-7000-8000-000000000002", "01a1aaaa-0000-7000-8000-000000000001", "Клиенты", 1);
    });
  });
  const projects = sidebar.getByTestId("folder-node").filter({ hasText: "Проекты" });
  await expect(projects).toBeVisible();
  await expect(notebookChevron).toHaveCount(1);
  await expect(sidebar.getByTestId("folder-node").filter({ hasText: "Клиенты" })).toHaveCount(0);
  await projects.getByRole("button", { name: /Развернуть «Проекты»/ }).click();
  await expect(sidebar.getByTestId("folder-node").filter({ hasText: "Клиенты" })).toBeVisible();

  // A new folder from the notebook's context menu.
  await sidebar.getByRole("link", { name: /Заметки/ }).first().click({ button: "right" });
  await page.getByRole("menuitem", { name: "Новая папка" }).click();
  await expect(sidebar.getByTestId("folder-node").filter({ hasText: "Новая папка" })).toBeVisible();

  // Drag a note (its tab) into a folder.
  await newDoc(page, "В папку", "текст");
  await page.getByTestId("tab-strip").getByTestId("tab").filter({ hasText: "В папку" }).dragTo(projects);
  await expect(page.getByText("Перемещено", { exact: true }).first()).toBeVisible();
  await projects.click();
  await expect(page.getByRole("main").getByRole("link", { name: /В папку/ })).toBeVisible();

  // Inside a folder: a breadcrumb back to the notebook, and its subfolders as cards above the documents.
  const strip = page.getByTestId("folder-strip");
  await expect(strip.getByTestId("folder-card")).toHaveCount(1);
  await expect(strip.getByTestId("folder-card")).toContainText("Клиенты");
  await expect(strip.getByTestId("folder-card")).toContainText("Пусто");
  // The notebook's top level lists its own folders (count included); the context menu is the sidebar's.
  await page.getByRole("main").getByRole("link", { name: /Заметки/ }).first().click();
  await expect(page).toHaveURL(/\/notebook\//);
  const projectsCard = strip.getByTestId("folder-card").filter({ hasText: "Проекты" });
  await expect(projectsCard).toContainText("1 документ · 1 папка");
  await expect(strip.getByTestId("folder-card")).toHaveCount(2);
  await projectsCard.click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Переименовать" })).toBeVisible();
  await page.keyboard.press("Escape");
  await projectsCard.click();
  await expect(page).toHaveURL(/\/folder\//);
  await expect(page.getByRole("main").getByRole("link", { name: /В папку/ })).toBeVisible();

  // A folder without subfolders shows no strip.
  await strip.getByTestId("folder-card").click();
  await expect(page.getByRole("main").getByText("Клиенты").first()).toBeVisible();
  await expect(strip).toHaveCount(0);
});
