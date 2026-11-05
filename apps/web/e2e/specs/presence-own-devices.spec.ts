import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

// Presence (awareness `user.account`): the user's own other device is not another person — no
// avatar and no caret for it. Another account is still shown (members.spec.ts).
test("my other device editing the same note shows neither an avatar nor a caret", async ({ page, browser }) => {
  const email = uniqueEmail("own-devices");
  await signUp(page, email);
  await newDoc(page, "Два устройства", "Текст");
  await expectSynced(page);
  const noteId = page.url().split("/doc/")[1]!.split(/[?#]/)[0]!;

  const other = await browser.newContext();
  const q = await other.newPage();
  await signIn(q, email);
  await q.goto(`/doc/${noteId}`);
  await q.locator(".ds-prose p").last().click();
  await q.keyboard.press("End");
  await q.keyboard.type(" и со второго устройства");
  await expectSynced(q);
  // The edit arrives (so presence had every chance to arrive too), but no person is shown.
  await expect(page.locator(".ds-prose")).toContainText("со второго устройства", { timeout: 20_000 });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("presence")).toHaveCount(0);
  await expect(page.locator(".ds-collab-caret")).toHaveCount(0);
  await other.close();
});
