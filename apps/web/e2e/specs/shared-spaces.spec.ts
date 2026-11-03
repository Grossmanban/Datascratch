import { expect, test, type Page } from "@playwright/test";
import { expectSynced, signUp, uniqueEmail } from "./helpers";

// D-62 «Общие пространства» (spec/08): a whole space shared with people, its notebooks seen by all.

async function pickSpace(page: Page, name: string) {
  // A menu still closing would take the click (its exit animation).
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.getByTestId("space-switcher").click();
  await page.getByRole("menuitemcheckbox", { name: new RegExp(name) }).or(page.getByRole("menuitem", { name: new RegExp(name) })).first().click();
  await expect(page.getByTestId("space-switcher")).toContainText(name);
}

async function acceptInvitation(p: Page) {
  await p.reload();
  await p.getByTestId("invitations-row").click();
  await expect(p.getByTestId("invitation-in").first()).toContainText("приглашает вас в общее пространство");
  await p.getByTestId("invitation-in").first().getByTestId("accept-invitation").click();
  await p.getByRole("dialog").getByRole("button", { name: /Закрыть|Close/ }).click();
}

async function openMembers(page: Page) {
  if (await page.getByTestId("space-members").isVisible()) return;
  await page.getByTestId("space-switcher").click();
  await page.getByRole("menuitem", { name: "Участники…" }).click();
  await expect(page.getByTestId("space-members")).toBeVisible();
}

async function typeNewNote(p: Page, title: string, body: string) {
  await p.waitForURL(/\/doc\//);
  await expect(p.locator(".ds-prose")).toBeVisible();
  await p.keyboard.type(title);
  await p.keyboard.press("Enter");
  await p.keyboard.type(body);
  await expectSynced(p);
}

test("shared space: created shared, a member joins, sees it in the switcher and writes; a viewer only reads", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const owner = uniqueEmail("spowner");
  const friend = uniqueEmail("speditor");
  const reader = uniqueEmail("spviewer");
  const fc = await browser.newContext();
  const q = await fc.newPage();
  await signUp(q, friend);
  const rc = await browser.newContext();
  const r = await rc.newPage();
  await signUp(r, reader);

  await signUp(page, owner);
  await page.getByTestId("space-switcher").click();
  await page.getByRole("menuitem", { name: "Новое общее пространство" }).click();
  // It opens with its members right away.
  const dialog = page.getByTestId("space-members");
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("space-switcher")).toContainText("Общее пространство");
  for (const [email, role] of [
    [friend, "Может редактировать"],
    [reader, "Только чтение"],
  ] as const) {
    await page.getByTestId("invite-email").fill(email);
    await page.getByTestId("invite-role").click();
    await page.getByRole("menuitem", { name: role }).click();
    await page.getByTestId("invite-submit").click();
    await expect(dialog.getByTestId("invitation").filter({ hasText: email })).toBeVisible();
  }
  await page.getByRole("dialog").getByRole("button", { name: /Закрыть|Close/ }).click();
  // The owner writes a note in the space's notebook.
  await page.getByTestId("new-doc").click();
  await typeNewNote(page, "План пространства", "общий текст");

  // The editor accepts; the owner's client hands them the space key (here: «Участники» is open).
  await acceptInvitation(q);
  await openMembers(page);
  await expect(async () => {
    await q.getByTestId("space-switcher").click();
    await expect(q.getByRole("menu")).toContainText("Общее пространство", { timeout: 2_000 });
    await q.keyboard.press("Escape");
  }).toPass({ timeout: 40_000 });
  await pickSpace(q, "Общее пространство");
  await expect(q.getByTestId("doc-card").filter({ hasText: "План пространства" })).toBeVisible({ timeout: 30_000 });
  await q.getByTestId("doc-card").filter({ hasText: "План пространства" }).click();
  await expect(q.locator(".ds-prose")).toContainText("общий текст", { timeout: 20_000 });
  await q.locator(".ds-prose p").last().click();
  await q.keyboard.press("End");
  await q.keyboard.type(" и правка участника");
  await expectSynced(q);
  await expect(page.locator(".ds-prose")).toContainText("общий текст и правка участника", { timeout: 20_000 });
  // The editor creates a note of their own there; the owner gets it.
  await q.getByTestId("new-doc").click();
  await typeNewNote(q, "От участника", "заметка участника");
  await page.goto("/all");
  await expect(page.getByTestId("doc-card").filter({ hasText: "От участника" })).toBeVisible({ timeout: 20_000 });

  // The viewer reads but cannot write: no new document, no new notebook, a read-only editor.
  await acceptInvitation(r);
  await openMembers(page);
  await expect(async () => {
    await r.getByTestId("space-switcher").click();
    await expect(r.getByRole("menu")).toContainText("Общее пространство", { timeout: 2_000 });
    await r.keyboard.press("Escape");
  }).toPass({ timeout: 40_000 });
  await pickSpace(r, "Общее пространство");
  await r.getByTestId("doc-card").filter({ hasText: "План пространства" }).click({ timeout: 30_000 });
  await expect(r.locator(".ds-prose")).toContainText("общий текст", { timeout: 20_000 });
  await expect(r.getByTestId("read-only-badge")).toBeVisible();
  await expect(r.locator(".ds-prose [contenteditable=true], .ds-prose[contenteditable=true]")).toHaveCount(0);

  await fc.close();
  await rc.close();
});
