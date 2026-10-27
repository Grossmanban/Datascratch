import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { UploadEditor } from "./UploadEditor";

const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function ready(page: Page) {
  await page.waitForFunction(() => window.__up?.ready === true);
}

/** Inserts a file at the caret as a paste/drop would. */
async function insert(page: Page, kind: "image" | "pdf") {
  await page.evaluate(
    ({ kind, b64 }) => {
      const file =
        kind === "image"
          ? new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], "фото.png", { type: "image/png" })
          : new File([new Uint8Array(2048)], "отчёт.pdf", { type: "application/pdf" });
      window.__up!.api.insertFiles([file]);
    },
    { kind, b64: PNG_B64 },
  );
}

/** Attributes of the n-th top-level Y element with this name, and its identity tag. */
const yBlock = (page: Page, name: string) =>
  page.evaluate((name) => {
    const el = (window.__up!.doc.getXmlFragment("content").toArray() as { nodeName: string; getAttributes(): Record<string, unknown> }[]).find((e) => e.nodeName === name) as
      | ({ nodeName: string; getAttributes(): Record<string, unknown> } & { __tag?: string })
      | undefined;
    if (!el) return null;
    el.__tag ??= Math.random().toString(36).slice(2);
    return { ...el.getAttributes(), __tag: el.__tag } as Record<string, unknown> & { __tag: string };
  }, name);

test("an image appears at once with a local preview and a progress ring, then gets its attachment (same block)", async ({ mount, page }) => {
  await mount(<UploadEditor />);
  await ready(page);
  await insert(page, "image");
  // Immediately: the block, a blob: preview, the ring — before the upload finished.
  const img = page.locator(".ds-image img");
  await expect(img).toHaveAttribute("src", /^blob:/);
  const ring = page.locator(".ds-image .ds-upload");
  await expect(ring).toBeVisible();
  await expect(ring).toHaveAttribute("data-status", "uploading");
  expect(await page.evaluate(() => window.__up!.calls.length)).toBe(1);
  const placeholder = await yBlock(page, "image");
  expect(placeholder!.blockId).toBeTruthy();
  expect(placeholder!.attachmentId).toBeUndefined();
  // Progress updates the ring.
  await page.evaluate(() => window.__up!.calls[0]!.onProgress?.(0.4));
  await expect(ring).toHaveAttribute("aria-label", "Загрузка 40%");
  await expect(page.locator(".ds-image .ds-upload-bar")).toHaveCSS("stroke-dashoffset", "60px");
  // Stored: the same Y element gets the attachmentId; the ring goes; the final URL is resolved.
  await page.evaluate(() => window.__up!.calls[0]!.resolve({ attachmentId: "att-1", name: "фото.png", size: 68, mime: "image/png" }));
  await expect(ring).toBeHidden();
  const stored = await yBlock(page, "image");
  expect(stored!.attachmentId).toBe("att-1");
  expect(stored!.blockId).toBe(placeholder!.blockId);
  expect(stored!.__tag).toBe(placeholder!.__tag);
  await expect.poll(() => page.evaluate(() => window.__up!.resolved)).toContain("att-1");
  await expect(img).toHaveAttribute("src", /^data:image\/png/);
  // One undo removes the whole block (the attachment swap is not an undo step of its own).
  await page.evaluate(() => window.__up!.api.undoManager.undo());
  await expect(page.locator(".ds-image")).toHaveCount(0);
});

test("a failed upload offers «Повторить» and «Удалить»; retry stores it, remove drops the block", async ({ mount, page }) => {
  await mount(<UploadEditor />);
  await ready(page);
  await insert(page, "image");
  await page.evaluate(() => window.__up!.calls[0]!.reject(new Error("offline")));
  const overlay = page.locator(".ds-image .ds-upload");
  await expect(overlay).toHaveAttribute("data-status", "failed");
  await expect(overlay).toContainText("Не удалось загрузить");
  await overlay.getByRole("button", { name: "Повторить" }).click();
  await expect(overlay).toHaveAttribute("data-status", "uploading");
  expect(await page.evaluate(() => window.__up!.calls.length)).toBe(2);
  await page.evaluate(() => window.__up!.calls[1]!.resolve({ attachmentId: "att-2", name: "фото.png", size: 68, mime: "image/png" }));
  await expect(overlay).toBeHidden();
  expect((await yBlock(page, "image"))!.attachmentId).toBe("att-2");

  await insert(page, "image");
  await page.evaluate(() => window.__up!.calls[2]!.reject(new Error("offline")));
  const second = page.locator(".ds-image").nth(1).locator(".ds-upload");
  await expect(second).toHaveAttribute("data-status", "failed");
  await second.getByRole("button", { name: "Удалить" }).click();
  await expect(page.locator(".ds-image")).toHaveCount(1);
});

test("a file gets a placeholder row with a ring, then its stored name, size and type", async ({ mount, page }) => {
  await mount(<UploadEditor />);
  await ready(page);
  await insert(page, "pdf");
  const row = page.locator(".ds-file");
  await expect(row).toContainText("отчёт.pdf");
  await expect(row.locator(".ds-upload")).toHaveAttribute("data-status", "uploading");
  const placeholder = await yBlock(page, "file");
  expect(placeholder!.attachmentId).toBeUndefined();
  await page.evaluate(() => window.__up!.calls[0]!.resolve({ attachmentId: "att-pdf", name: "отчёт.pdf", size: 2048, mime: "application/pdf" }));
  await expect(row.locator(".ds-upload")).toBeHidden();
  const stored = await yBlock(page, "file");
  expect(stored).toMatchObject({ attachmentId: "att-pdf", name: "отчёт.pdf", size: 2048, mime: "application/pdf", blockId: placeholder!.blockId, __tag: placeholder!.__tag });
});
