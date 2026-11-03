import { expect, test, type Page } from "@playwright/test";
import { expectSynced, signUp, uniqueEmail } from "./helpers";

// D-62 «Общие пространства» (spec/08): a whole space shared with people, its notebooks seen by all.

/** The space switcher, once any menu still closing is gone (a click during its exit animation is lost). */
async function openSwitcher(page: Page) {
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.getByTestId("space-switcher").click();
  await expect(page.getByRole("menu")).toBeVisible();
}

async function pickSpace(page: Page, name: string) {
  await openSwitcher(page);
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
  await openSwitcher(page);
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
  await openSwitcher(page);
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
    await openSwitcher(q);
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
    await openSwitcher(r);
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

test("shared space: a personal space made shared, a notebook moved in, a member removed (new key), a notebook moved out, leaving", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const owner = uniqueEmail("sp2owner");
  const friend = uniqueEmail("sp2friend");
  const third = uniqueEmail("sp2third");
  const fc = await browser.newContext();
  const q = await fc.newPage();
  await signUp(q, friend);
  const tc = await browser.newContext();
  const r = await tc.newPage();
  await signUp(r, third);

  await signUp(page, owner);
  // A second personal space with a notebook and a note in it, to be moved in later.
  await openSwitcher(page);
  await page.getByRole("menuitem", { name: "Новое пространство" }).click();
  await expect(page.getByTestId("space-switcher")).toContainText("Новое пространство");
  await page.getByTestId("new-doc").click();
  await typeNewNote(page, "Личный архив", "старая история");
  // The first space («Личное») becomes shared: a plain warning first.
  await pickSpace(page, "Личное");
  await openSwitcher(page);
  await page.getByRole("menuitem", { name: "Пригласить в пространство…" }).click();
  const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog").filter({ hasText: "общим" }));
  await expect(confirm).toContainText("всей их историей");
  await confirm.getByRole("button", { name: "Сделать общим" }).click();
  const dialog = page.getByTestId("space-members");
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  for (const email of [friend, third]) {
    await page.getByTestId("invite-email").fill(email);
    await page.getByTestId("invite-submit").click();
    await expect(dialog.getByTestId("invitation").filter({ hasText: email })).toBeVisible();
  }
  for (const p of [q, r]) await acceptInvitation(p);
  // Keys go to both while «Участники» is open; both members are active.
  await expect(dialog.getByTestId("member")).toHaveCount(2, { timeout: 30_000 });
  await expect(dialog.getByTestId("give-access")).toHaveCount(0, { timeout: 30_000 });
  await page.getByRole("dialog").getByRole("button", { name: /Закрыть|Close/ }).click();

  // The member sees the welcome note of the space that was personal before.
  await expect(async () => {
    await openSwitcher(q);
    await expect(q.getByRole("menu")).toContainText("Личное", { timeout: 2_000 });
    await q.keyboard.press("Escape");
  }).toPass({ timeout: 40_000 });
  await expect(q.getByRole("menu")).toHaveCount(0);
  await openSwitcher(q);
  // Their own personal space is called «Личное» too: the shared one has the members' avatars.
  await q.getByRole("menu").locator("[role^=menuitem]").filter({ has: q.getByTestId("space-avatars") }).click();
  await expect(q.getByTestId("doc-card").filter({ hasText: "Добро пожаловать" })).toBeVisible({ timeout: 30_000 });

  // The owner moves the notebook with «Личный архив» into the shared space — warned about history.
  await pickSpace(page, "Новое пространство");
  await page.getByTestId("sidebar").getByRole("link", { name: /Новый блокнот|Заметки/ }).first().click({ button: "right" });
  await page.getByRole("menuitem", { name: "Переместить в пространство…" }).hover();
  await page.getByRole("menuitem", { name: /Личное · Общие/ }).click();
  const moveIn = page.getByRole("alertdialog").or(page.getByRole("dialog").filter({ hasText: "историю" }));
  await expect(moveIn).toContainText("всю его историю");
  await moveIn.getByRole("button", { name: "Перенести" }).click();
  await expect(page.getByText(/Блокнот теперь в «Личное»/).first()).toBeVisible({ timeout: 20_000 });
  await q.reload();
  await expect(q.getByTestId("doc-card").filter({ hasText: "Личный архив" })).toBeVisible({ timeout: 30_000 });
  await q.getByTestId("doc-card").filter({ hasText: "Личный архив" }).click();
  await expect(q.locator(".ds-prose")).toContainText("старая история", { timeout: 20_000 });

  // The owner removes the third member: the space key changes; the remaining member reads and writes on.
  await pickSpace(page, "Личное");
  await openSwitcher(page);
  await page.getByRole("menuitem", { name: "Участники…" }).click();
  const m3 = dialog.getByTestId("member").filter({ hasText: third });
  await expect(async () => {
    await m3.getByTestId("member-role").click();
    await expect(page.getByRole("menu").getByRole("menuitem", { name: "Закрыть доступ" })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("menu").getByRole("menuitem", { name: "Закрыть доступ" }).click();
  await page.getByRole("alertdialog").or(page.getByRole("dialog").filter({ hasText: "Закрыть доступ для" })).getByRole("button", { name: "Закрыть доступ" }).click();
  await expect(dialog.getByTestId("member")).toHaveCount(1);
  await page.getByRole("dialog").getByRole("button", { name: /Закрыть|Close/ }).click();
  await page.waitForTimeout(3000);
  await q.goto("/all");
  await q.getByTestId("doc-card").filter({ hasText: "Личный архив" }).click({ timeout: 30_000 });
  await expect(q.locator(".ds-prose")).toContainText("старая история", { timeout: 20_000 });
  await q.locator(".ds-prose p").last().click();
  await q.keyboard.press("End");
  await q.keyboard.type(" после смены ключа");
  await expectSynced(q);
  await page.getByTestId("doc-card").filter({ hasText: "Личный архив" }).click();
  await expect(page.locator(".ds-prose")).toContainText("старая история после смены ключа", { timeout: 20_000 });
  // The removed member no longer has the space.
  await r.reload();
  await expect(async () => {
    await openSwitcher(r);
    await expect(r.getByRole("menu")).not.toContainText("Общие", { timeout: 2_000 });
    await r.keyboard.press("Escape");
  }).toPass({ timeout: 40_000 });

  // The owner moves the notebook out again: the member no longer lists it.
  await page.goto("/all");
  await page.getByTestId("sidebar").getByRole("link", { name: /Новый блокнот|Заметки/ }).last().click({ button: "right" });
  await page.getByRole("menuitem", { name: "Вынести в личное пространство" }).hover();
  await page.getByRole("menuitem", { name: "Новое пространство" }).click();
  await page.getByRole("alertdialog").or(page.getByRole("dialog").filter({ hasText: "Вынести" })).getByRole("button", { name: "Вынести" }).click();
  await expect(page.getByText(/Блокнот теперь в «Новое пространство»/).first()).toBeVisible({ timeout: 20_000 });
  await q.goto("/all");
  await expect(q.getByTestId("doc-card").filter({ hasText: "Добро пожаловать" })).toBeVisible({ timeout: 30_000 });
  await expect(q.getByTestId("doc-card").filter({ hasText: "Личный архив" })).toHaveCount(0, { timeout: 30_000 });

  // The member leaves: the space is gone from their switcher.
  await openSwitcher(q);
  await q.getByRole("menuitem", { name: "Участники…" }).click();
  await q.getByTestId("leave-space").click();
  await q.getByRole("alertdialog").or(q.getByRole("dialog").filter({ hasText: "Выйти из" })).getByRole("button", { name: "Выйти из пространства" }).click();
  await expect(q.getByText("Вы вышли из общего пространства").first()).toBeVisible({ timeout: 15_000 });
  await expect(q.getByRole("menu")).toHaveCount(0);
  await openSwitcher(q);
  await expect(q.getByRole("menu")).not.toContainText("Общие");
  await fc.close();
  await tc.close();
});
