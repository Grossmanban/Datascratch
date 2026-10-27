import { expect, test, type Page } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

// A real 2×2 PNG (red), small enough to inline.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");

async function slash(page: Page, item: RegExp) {
  await page.locator(".ds-prose p").last().click();
  await page.keyboard.press("End");
  // «/» opens the block menu at the start of a paragraph or after a space.
  await page.keyboard.type(" /");
  await page.getByRole("option", { name: item }).first().click();
}

test("images: «/» → Картинка and paste insert an encrypted image that another device sees (D-51 minimal)", async ({ page, browser }) => {
  const email = uniqueEmail("images");
  await signUp(page, email);
  await newDoc(page, "С картинками", "Текст");
  const noteId = page.url().split("/doc/")[1]!.split(/[?#]/)[0]!;

  // «/» menu → picture → the file picker.
  const chooser = page.waitForEvent("filechooser");
  await slash(page, /Картинка|Изображение|Image/);
  await (await chooser).setFiles({ name: "red.png", mimeType: "image/png", buffer: PNG });
  const images = page.locator(".ds-prose img");
  await expect(images).toHaveCount(1, { timeout: 15_000 });
  await expect(images.first()).toHaveAttribute("src", /^blob:/);

  // Paste an image from the clipboard.
  await page.locator(".ds-prose p").last().click();
  await page.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], "pasted.png", { type: "image/png" }));
    const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
    document.querySelector(".ds-prose")!.dispatchEvent(ev);
  }, PNG.toString("base64"));
  await expect(images).toHaveCount(2, { timeout: 15_000 });
  await expectSynced(page);

  // Another device decrypts and shows both.
  const other = await browser.newContext();
  const q = await other.newPage();
  await signIn(q, email);
  await q.goto(`/doc/${noteId}`);
  const theirs = q.locator(".ds-prose img");
  await expect(theirs).toHaveCount(2, { timeout: 20_000 });
  await expect.poll(() => theirs.first().evaluate((img) => (img as HTMLImageElement).naturalWidth), { timeout: 20_000 }).toBe(2);
  await other.close();
});

test("the top bar's «Вставить картинку» inserts several pictures, never into the title, and is there on a phone", async ({ page }) => {
  await signUp(page, uniqueEmail("picture-button"));
  await newDoc(page, "Кнопка", "Текст");
  // The caret is still in the text; put it back into the title to check it is not used there.
  await page.locator(".ds-prose .ds-title").click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("insert-picture").click();
  await (await chooser).setFiles([
    { name: "a.png", mimeType: "image/png", buffer: PNG },
    { name: "b.png", mimeType: "image/png", buffer: PNG },
  ]);
  await expect(page.locator(".ds-prose img")).toHaveCount(2, { timeout: 15_000 });
  await expect(page.locator(".ds-prose .ds-title")).toHaveText("Кнопка");
  await expect(page.locator(".ds-prose .ds-title img")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("insert-picture")).toBeVisible();
});
