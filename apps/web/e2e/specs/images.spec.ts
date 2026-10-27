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

test("rich paste: an image linked from pasted HTML is fetched through the server (D-52); a blocked one stays a link", async ({ page }) => {
  // The mock stands in for the internet (a `.png` URL gets a picture); against a real server only
  // the refusal is checked: a private address is always blocked (decisions/0052).
  const mock = !process.env.E2E_SERVER_URL;
  await signUp(page, uniqueEmail("paste-remote"));
  await newDoc(page, "Вставка из веба", "Текст");
  const fetched: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/v1/fetch-image")) fetched.push(JSON.parse(r.postData() ?? "{}").url);
  });
  const allowed = "https://images.example.com/cat.png";
  const blocked = "http://127.0.0.1/dog.png";
  await page.locator(".ds-prose p").last().click();
  await page.evaluate((html) => {
    const dt = new DataTransfer();
    dt.setData("text/html", html);
    dt.setData("text/plain", "Кот: и");
    document.querySelector(".ds-prose")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, `${mock ? `<p>Кот:</p><img src="${allowed}" alt="кот">` : ""}<p>и</p><img src="${blocked}" alt="пёс">`);
  // The blocked one becomes a link to its address; the allowed one an encrypted attachment.
  await expect(page.locator(`.ds-prose a[href="${blocked}"]`)).toHaveText("пёс", { timeout: 20_000 });
  const images = page.locator(".ds-prose img");
  if (mock) {
    await expect(images).toHaveCount(1, { timeout: 15_000 });
    await expect(images.first()).toHaveAttribute("src", /^blob:/);
    await expect.poll(() => images.first().evaluate((img) => (img as HTMLImageElement).naturalWidth), { timeout: 15_000 }).toBe(2);
    expect(fetched.sort()).toEqual([allowed, blocked].sort());
  } else await expect(images).toHaveCount(0);
  await expectSynced(page);
});

test("attachments open safely: a document type is downloaded, never opened on our origin; an SVG is stored as PNG", async ({ page, context }) => {
  await signUp(page, uniqueEmail("attach-open"));
  await newDoc(page, "Вложения", "Текст");
  // An HTML file: double-click downloads it instead of opening a tab (it would run on our origin).
  let chooser = page.waitForEvent("filechooser");
  await slash(page, /Файл PDF|File/);
  await (await chooser).setFiles({ name: "page.html", mimeType: "text/html", buffer: Buffer.from("<script>parent.pwned=1</script>") });
  const file = page.locator(".ds-prose .ds-file").first();
  await expect(file).toBeVisible({ timeout: 15_000 });
  await expect(file).not.toHaveClass(/is-uploading/, { timeout: 15_000 });
  let popups = 0;
  context.on("page", () => popups++);
  const download = page.waitForEvent("download");
  await file.dblclick();
  expect((await download).suggestedFilename()).toBe("page.html");
  expect(popups).toBe(0);

  // A picked SVG becomes a PNG attachment (an SVG is a document that can carry scripts).
  const registered: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/v1/attachments")) registered.push(JSON.parse(r.postData() ?? "{}").mime);
  });
  chooser = page.waitForEvent("filechooser");
  await slash(page, /Картинка|Изображение|Image/);
  await (await chooser).setFiles({
    name: "dot.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="red"/><script>alert(1)</script></svg>'),
  });
  const img = page.locator(".ds-prose img").last();
  await expect(img).toHaveAttribute("src", /^blob:/, { timeout: 15_000 });
  await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).naturalWidth), { timeout: 15_000 }).toBe(4);
  await expect.poll(() => registered.at(-1)).toBe("image/png");
});
