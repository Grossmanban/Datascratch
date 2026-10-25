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
  await page.locator("article").hover();
  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("add-cover").click();
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
