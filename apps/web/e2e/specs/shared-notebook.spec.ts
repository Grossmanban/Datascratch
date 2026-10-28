import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, signUp, uniqueEmail } from "./helpers";

// D-54, the member's side of a shared notebook (owner report 2026-10-28): the notes that were
// already there are listed; a note the member creates stays listed after closing and reloading,
// the owner gets it; all of it survives the owner's key change.

test("shared notebook: existing notes listed, a member's new note stays, also after a key change", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const owner = uniqueEmail("nbowner");
  const friend = uniqueEmail("nbfriend");
  const third = uniqueEmail("nbthird");
  const fc = await browser.newContext();
  const q = await fc.newPage();
  await signUp(q, friend);
  const tc = await browser.newContext();
  const r = await tc.newPage();
  await signUp(r, third);

  await signUp(page, owner);
  await newDoc(page, "Уже была", "старый текст");
  await expectSynced(page);
  const sidebar = page.getByTestId("sidebar");
  const openShare = async () => {
    await sidebar.getByRole("link", { name: /Заметки/ }).first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "Поделиться…" }).click();
  };
  await openShare();
  for (const email of [friend, third]) {
    await page.getByTestId("invite-email").fill(email);
    await page.getByTestId("invite-submit").click();
    await expect(page.getByTestId("invitation").filter({ hasText: email })).toBeVisible();
  }
  for (const p of [q, r]) {
    await p.reload();
    await p.getByTestId("invitations-row").click();
    await p.getByTestId("invitation-in").getByTestId("accept-invitation").click();
    await p.getByRole("dialog").getByRole("button", { name: /Закрыть|Close/ }).click();
  }

  // The member opens the shared notebook: the notes that were there before are listed.
  const shared = q.getByTestId("shared-row").filter({ hasText: "Заметки" });
  await expect(shared).not.toHaveAttribute("data-waiting", "", { timeout: 30_000 });
  await shared.click();
  const list = q.getByTestId("doc-card");
  await expect(list.filter({ hasText: "Уже была" })).toBeVisible({ timeout: 20_000 });
  await expect(list.filter({ hasText: "Добро пожаловать" })).toBeVisible();

  // The member creates a note there, closes it: it stays in the list, also after a reload.
  await q.getByRole("button", { name: "Новый документ" }).last().click();
  await q.waitForURL(/\/doc\//);
  await expect(q.locator(".ds-prose")).toBeVisible();
  await expect(q.locator(".ds-prose [contenteditable=true], .ds-prose[contenteditable=true]").first()).toBeFocused({ timeout: 10_000 }).catch(() => undefined);
  await q.keyboard.type("От участника");
  await q.keyboard.press("Enter");
  await q.keyboard.type("текст участника");
  await expectSynced(q);
  await q.getByTestId("close-tab").click();
  await shared.click();
  await expect(list.filter({ hasText: "От участника" })).toBeVisible({ timeout: 15_000 });
  await q.reload();
  await shared.click();
  await expect(list.filter({ hasText: "От участника" })).toBeVisible({ timeout: 20_000 });
  await expect(list.filter({ hasText: "Уже была" })).toBeVisible();
  // The owner has it.
  await page.getByRole("dialog").getByRole("button", { name: /Закрыть|Close/ }).click();
  await sidebar.getByRole("link", { name: /Заметки/ }).first().click();
  await expect(page.getByTestId("doc-card").filter({ hasText: "От участника" })).toBeVisible({ timeout: 20_000 });

  // The owner closes access for the third person: the key changes (crypto.md §10.3).
  await openShare();
  const people = page.getByTestId("people");
  const m3 = people.getByTestId("member").filter({ hasText: third });
  await expect(m3.getByTestId("give-access")).toHaveCount(0, { timeout: 20_000 });
  await expect(async () => {
    await m3.getByTestId("member-role").click();
    await expect(page.getByRole("menu").getByRole("menuitem", { name: "Закрыть доступ" })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("menu").getByRole("menuitem", { name: "Закрыть доступ" }).click();
  await page.getByRole("alertdialog").or(page.getByRole("dialog").filter({ hasText: "Закрыть доступ для" })).getByRole("button", { name: "Закрыть доступ" }).click();
  await expect(people.getByTestId("member")).toHaveCount(1);
  // The rotation runs in the owner's client right after; give it a moment to finish.
  await page.waitForTimeout(3000);

  // After the key change the member still lists and opens everything, and writes on.
  await q.reload();
  await shared.click();
  await expect(list.filter({ hasText: "От участника" })).toBeVisible({ timeout: 30_000 });
  await expect(list.filter({ hasText: "Уже была" })).toBeVisible();
  await list.filter({ hasText: "Уже была" }).click();
  await expect(q.locator(".ds-prose")).toContainText("старый текст", { timeout: 20_000 });
  await q.locator(".ds-prose p").last().click();
  await q.keyboard.press("End");
  await q.keyboard.type(" после смены ключа");
  await expectSynced(q);
  await q.getByTestId("close-tab").click();
  await page.getByRole("dialog").getByRole("button", { name: /Закрыть|Close/ }).click();
  await page.getByTestId("doc-card").filter({ hasText: "Уже была" }).click();
  await expect(page.locator(".ds-prose")).toContainText("старый текст после смены ключа", { timeout: 20_000 });
  // A new note by the member after the key change is listed too.
  await shared.click();
  await q.getByRole("button", { name: "Новый документ" }).last().click();
  await q.waitForURL(/\/doc\//);
  await expect(q.locator(".ds-prose")).toBeVisible();
  await expect(q.locator(".ds-prose [contenteditable=true], .ds-prose[contenteditable=true]").first()).toBeFocused({ timeout: 10_000 }).catch(() => undefined);
  await q.keyboard.type("После ротации");
  await q.keyboard.press("Enter");
  await q.keyboard.type("ещё текст");
  await expectSynced(q);
  await q.getByTestId("close-tab").click();
  await q.reload();
  await shared.click();
  await expect(list.filter({ hasText: "После ротации" })).toBeVisible({ timeout: 20_000 });
  await fc.close();
  await tc.close();
});
