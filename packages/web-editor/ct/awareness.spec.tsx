import { expect, test } from "@playwright/experimental-ct-react";
import { AwarenessEditor } from "./AwarenessEditor";

test("changing awareness keeps the same editor and moves presence to the new source", async ({ mount, page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const component = await mount(<AwarenessEditor docKey="d1" awarenessKey="a" />);
  await page.waitForFunction(() => window.__aw?.ready === true);
  await page.evaluate(() => window.__aw!.api!.editor.commands.focus(5));
  await expect.poll(() => page.evaluate(() => Boolean(window.__aw!.awareness["d1:a"]!.getLocalState()?.cursor))).toBe(true);

  await component.update(<AwarenessEditor docKey="d1" awarenessKey="b" />);
  await page.waitForTimeout(100);
  const same = await page.evaluate(() => window.__aw!.apis.length === 1 && !window.__aw!.api!.editor.isDestroyed);
  expect(same).toBe(true);
  await page.evaluate(() => {
    const e = window.__aw!.api!.editor;
    e.commands.focus(8);
    e.commands.insertContent("!");
  });
  await expect.poll(() => page.evaluate(() => Boolean(window.__aw!.awareness["d1:b"]!.getLocalState()?.cursor))).toBe(true);
  expect(await page.evaluate(() => window.__aw!.awareness["d1:b"]!.getLocalState()?.user?.name)).toBe("Tester");

  await component.update(<AwarenessEditor docKey="d1" awarenessKey={null} />);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__aw!.apis.length)).toBe(1);
  expect(errors).toEqual([]);
});

test("remounting while the format toolbar is open does not throw", async ({ mount, page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const component = await mount(<AwarenessEditor docKey="d2" awarenessKey="a" />);
  await page.waitForFunction(() => window.__aw?.ready === true && !window.__aw.api!.editor.isDestroyed && window.__aw.api!.editor.state.doc.textContent.includes("presence"));
  // Select a word so the format toolbar is shown.
  await page.evaluate(() => {
    const e = window.__aw!.api!.editor;
    e.commands.focus();
    e.commands.setTextSelection({ from: 4, to: 9 });
  });
  await expect(page.getByRole("toolbar", { name: "Форматирование" })).toBeVisible();
  // A different document remounts the editor.
  await component.update(<AwarenessEditor docKey="d3" awarenessKey="a" />);
  await page.waitForFunction(() => window.__aw!.apis.length >= 2);
  await page.waitForTimeout(200);
  expect(errors).toEqual([]);
});
