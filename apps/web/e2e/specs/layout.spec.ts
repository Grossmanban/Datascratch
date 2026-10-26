import { expect, test } from "@playwright/test";
import { isExtended, newDoc, signUp, uniqueEmail } from "./helpers";

test("flexible layout: hide the sidebar, full screen per screen, close a document tab", async ({ page }) => {
  await signUp(page, uniqueEmail("layout"));
  const sidebar = page.getByTestId("sidebar");
  const panel = page.getByTestId("sidebar-panel");

  // The sidebar hides and stays hidden after a reload.
  await page.keyboard.press("Control+\\");
  await expect(panel).toHaveAttribute("data-open", "false");
  await page.reload();
  await expect(page.getByTestId("doc-card").first()).toBeVisible();
  await expect(panel).toHaveAttribute("data-open", "false");
  await page.keyboard.press("Control+\\");
  await expect(panel).toHaveAttribute("data-open", "true");

  // Full screen for documents: remembered for documents only.
  await newDoc(page, "Во весь экран", "Текст");
  await page.getByTestId("focus-toggle").click();
  await expect(panel).toHaveAttribute("data-open", "false");
  await page.reload();
  await expect(page.locator(".ds-prose")).toBeVisible();
  await expect(panel).toHaveAttribute("data-open", "false");
  await page.goto("/all");
  await expect(panel).toHaveAttribute("data-open", "true");
  if (isExtended()) {
    await page.goto("/calendar");
    await expect(page.getByTestId("focus-toggle")).toBeVisible();
    await page.keyboard.press("Control+Shift+F");
    await expect(panel).toHaveAttribute("data-open", "false");
    await page.keyboard.press("Control+Shift+F");
    await expect(panel).toHaveAttribute("data-open", "true");
  }

  // Explicit close of the document's tab.
  await page.goto("/all");
  await page.getByTestId("doc-card").filter({ hasText: "Во весь экран" }).click();
  await page.getByTestId("focus-toggle").click(); // leave full screen to see the tabs
  // The extended mode shows it as a tab; the minimal one has no tabs (D-51) and × just closes it.
  const tab = page.getByTestId("tab-strip").getByTestId("tab").filter({ hasText: "Во весь экран" });
  if (isExtended()) await expect(tab).toBeVisible();
  else await expect(page.getByTestId("tab-strip")).toHaveCount(0);
  await page.getByTestId("close-tab").click();
  await page.waitForURL("**/all");
  await expect(tab).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "Во весь экран" })).toHaveCount(0);
});
