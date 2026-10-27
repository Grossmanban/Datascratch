import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, signUp, uniqueEmail } from "./helpers";

// D-54: sharing with an account by email — the owner's «Люди» and the invitee's incoming invitations.

// Against a real server only once it serves the D-54 routes (a missing route is 404, an existing
// one without a session is 401); the mock always does.
test.beforeEach(async ({ request }) => {
  const server = process.env.E2E_SERVER_URL;
  if (!server) return;
  const res = await request.get(`${server}/v1/invitations/incoming`);
  test.skip(res.status() === 404, "this server has no D-54 sharing routes yet");
});
test("D-54: invite by email, the invitee accepts in the app, the owner changes the role and closes access", async ({ page, browser }) => {
  const owner = uniqueEmail("owner");
  const friend = uniqueEmail("friend");
  // The invitee already has an account (no owner confirmation needed, D-54 option A).
  const other = await browser.newContext();
  const q = await other.newPage();
  await signUp(q, friend);

  await signUp(page, owner);
  await newDoc(page, "Общий план", "Текст");
  await expectSynced(page);
  await page.getByTestId("share-button").click();
  const people = page.getByTestId("people");
  await expect(people).toContainText("Вы");
  await expect(people).toContainText("Владелец");
  // Own email is refused before asking the server.
  await page.getByTestId("invite-email").fill(owner);
  await expect(page.getByTestId("invite-submit")).toBeDisabled();
  await page.getByTestId("invite-email").fill(friend.toUpperCase());
  await page.getByTestId("invite-role").click();
  await page.getByRole("menuitem", { name: "Только чтение" }).click();
  await page.getByTestId("invite-submit").click();
  await expect(page.getByText("Приглашение отправлено").first()).toBeVisible();
  const invitation = people.getByTestId("invitation").filter({ hasText: friend });
  await expect(invitation).toContainText("Только чтение");

  // The invitee sees it in the app (who, what, which role) and accepts.
  await q.reload();
  await q.getByTestId("invitations-row").click();
  const incoming = q.getByTestId("invitation-in");
  await expect(incoming).toContainText(owner);
  await expect(incoming).toContainText("приглашает вас в документ");
  await expect(incoming).toContainText("Только чтение");
  await incoming.getByTestId("accept-invitation").click();
  await expect(q.getByText(/Принято|Готово/).first()).toBeVisible();
  await expect(q.getByTestId("invitations-row")).toHaveCount(0);

  // The owner sees a member; the key goes to them on its own (crypto.md §10.2), no waiting state left.
  await page.getByRole("dialog").getByRole("button", { name: /Закрыть|Close/ }).click();
  await page.getByTestId("share-button").click();
  const member = people.getByTestId("member").filter({ hasText: friend });
  await expect(member).toContainText("Только чтение");
  await expect(people.getByTestId("invitation")).toHaveCount(0);
  await expect(member.getByTestId("give-access")).toHaveCount(0, { timeout: 15_000 });

  // A guest link too: it carries the key, so it is re-created when the key changes.
  await page.getByTestId("create-share").click();
  const link = page.getByTestId("share-list").locator("li[data-url]").first();
  await expect(link).toBeVisible();
  const oldUrl = await link.getAttribute("data-url");
  await member.getByTestId("member-role").click();
  // The list re-reads members after the change; a menu opened before that would be closed by it.
  const reread = page.waitForResponse((r) => r.url().includes("/v1/members/") && r.request().method() === "GET");
  await page.getByRole("menuitem", { name: "Может редактировать" }).click();
  await reread;
  await expect(member.getByTestId("member-role")).toContainText("Может редактировать");

  // …and closes access after a plain-language warning.
  await member.getByTestId("member-role").click();
  await page.getByRole("menuitem", { name: "Закрыть доступ" }).click();
  const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog").filter({ hasText: "Закрыть доступ для" }));
  await expect(confirm).toContainText("То, что он уже видел, у него останется");
  await confirm.getByRole("button", { name: "Закрыть доступ" }).click();
  await expect(people.getByTestId("member")).toHaveCount(0);
  // The key changed (crypto.md §10.3): the guest link was re-created with it.
  await expect(page.getByText(/ссылка для гостей создана заново/).first()).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => page.getByTestId("share-list").locator("li[data-url]").first().getAttribute("data-url"), { timeout: 15_000 }).not.toBe(oldUrl);

  // The note keeps working for the owner with the new key version, also after a reload.
  await page.getByRole("dialog").getByRole("button", { name: /Закрыть|Close/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator(".ds-prose p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.type(" после смены ключа");
  await expectSynced(page);
  await page.reload();
  await expect(page.locator(".ds-prose")).toContainText("Текст после смены ключа", { timeout: 20_000 });
  await other.close();
});

test("D-54: an invitation to an email without an account waits; its link opens the invitations; it can be withdrawn", async ({ page, browser }) => {
  const owner = uniqueEmail("owner2");
  const later = uniqueEmail("later");
  await signUp(page, owner);
  await newDoc(page, "Для будущего", "Текст");
  await expectSynced(page);
  await page.getByTestId("share-button").click();
  await page.getByTestId("invite-email").fill(later);
  await page.getByTestId("invite-submit").click();
  const invitation = page.getByTestId("invitation").filter({ hasText: later });
  await expect(invitation).toContainText("Может редактировать");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await invitation.getByTestId("copy-invite").click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/invite\/[0-9a-f-]{36}$/);

  // The person signs up afterwards and opens the link: the invitation is there, highlighted.
  const other = await browser.newContext();
  const q = await other.newPage();
  await signUp(q, later);
  await q.goto(new URL(link).pathname);
  await expect(q).toHaveURL(/\/all$/);
  await expect(q.getByTestId("invitation-in")).toContainText(owner);

  // Withdrawn before it is accepted: it disappears for both.
  await invitation.getByTestId("cancel-invite").click();
  await expect(page.getByTestId("invitation")).toHaveCount(0);
  await q.keyboard.press("Escape");
  await q.reload();
  await expect(q.getByTestId("invitations-row")).toHaveCount(0);
  await other.close();
});
