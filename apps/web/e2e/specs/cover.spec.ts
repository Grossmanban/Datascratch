import { expect, test, type Page } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

async function makePng(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 160;
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 320, 160);
    grad.addColorStop(0, "#f6e7cf");
    grad.addColorStop(1, "#7b9bff");
    g.fillStyle = grad;
    g.fillRect(0, 0, 320, 160);
    return c.toDataURL("image/png").split(",")[1]!;
  });
  return Buffer.from(b64, "base64");
}

test("document cover: encrypted upload, visible on another device", async ({ page, browser }) => {
  const email = uniqueEmail("cover");
  await signUp(page, email);
  await newDoc(page, "С обложкой", "Текст");
  const png = await makePng(page);
  // spec/12 §12.7: no cover by default; added from «…» → «Обложка».
  await expect(page.getByTestId("doc-cover")).toHaveCount(0);
  await page.getByRole("button", { name: /Ещё|More/ }).click();
  await page.getByRole("menuitem", { name: "Обложка…" }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("cover-pick").click();
  await (await chooser).setFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
  await expect(page.getByTestId("doc-cover").locator("img")).toBeVisible({ timeout: 15_000 });
  await expectSynced(page);
  await page.waitForTimeout(1000); // background chunk upload

  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await signIn(p2, email);
  const card = p2.getByTestId("doc-card").filter({ hasText: "С обложкой" });
  await expect(card.locator("img")).toBeVisible({ timeout: 20_000 });
  await card.click();
  await expect(p2.getByTestId("doc-cover").locator("img")).toBeVisible({ timeout: 15_000 });
  await ctx.close();
});

test("cover from the clipboard; cards without a cover have no picture", async ({ page }) => {
  await signUp(page, uniqueEmail("cover-paste"));
  await expect(page.getByTestId("doc-card").first().locator("img")).toHaveCount(0);
  await newDoc(page, "Скриншот", "Текст");
  const png = await makePng(page);
  await page.getByRole("button", { name: /Ещё|More/ }).click();
  await page.getByRole("menuitem", { name: "Обложка…" }).click();
  await expect(page.getByTestId("cover-drop")).toBeVisible();
  await page.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], "shot.png", { type: "image/png" }));
    window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt }));
  }, png.toString("base64"));
  await expect(page.getByTestId("doc-cover").locator("img")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("cover-drop")).toBeHidden();
});
