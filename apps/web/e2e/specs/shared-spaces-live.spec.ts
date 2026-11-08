import { expect, test, type Page } from "@playwright/test";
import { createSpaceVia, expectSynced, signUp, uniqueEmail } from "./helpers";

// D-62, spec/08 «Скорость»: in a shared space everything reaches the other person in seconds, with
// no reload and no sign-out — the invitation, the space with its notebooks once accepted, a new
// note either way — and «Синхронизация…» settles.

/** Each step: the server says the account changed (`account_changed`, protocol 2) and the other
 *  client re-reads at once — the 3 s checks after inviting are only a safety net. */
const FAST = 3_000;

async function openSwitcher(page: Page) {
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.getByTestId("space-switcher").click();
  await expect(page.getByRole("menu")).toBeVisible();
}

const docRow = (p: Page, title: string) => p.getByTestId(/^doc-(card|row)$/).filter({ hasText: title });

async function typeNewNote(p: Page, title: string, body: string) {
  const before = p.url();
  await p.getByTestId("new-doc").click();
  await p.waitForURL((u) => u.pathname.startsWith("/doc/") && u.href !== before);
  await expect(p.locator(".ds-prose")).toBeVisible();
  await p.keyboard.type(title);
  await p.keyboard.press("Enter");
  await p.keyboard.type(body);
  await expectSynced(p);
}

test("shared space live: invitation, notebooks and new notes arrive in seconds, no reload", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const owner = uniqueEmail("liveowner");
  const friend = uniqueEmail("livefriend");
  const fc = await browser.newContext();
  const q = await fc.newPage();
  await signUp(q, friend);
  await signUp(page, owner);

  // A makes a shared space with a note, invites B and closes «Участники» (it no longer helps).
  await createSpaceVia(page, "Общее пространство", { shared: true });
  const dialog = page.getByTestId("space-invite-step");
  await page.getByTestId("invite-email").fill(friend);
  await page.getByTestId("invite-submit").click();
  await expect(dialog.getByTestId("invitation").filter({ hasText: friend })).toBeVisible();
  await page.getByTestId("space-invite-done").click();
  await typeNewNote(page, "Первая общая", "текст владельца");

  // B: the invitation appears without a reload; accepted, the space and its notebook are there in seconds.
  await expect(q.getByTestId("invitations-row")).toBeVisible({ timeout: FAST });
  await q.getByTestId("invitations-row").click();
  await q.getByTestId("invitation-in").first().getByTestId("accept-invitation").click();
  await q.getByRole("dialog").getByRole("button", { name: /Закрыть|Close/ }).click();
  await expect(async () => {
    await openSwitcher(q);
    try {
      await expect(q.getByRole("menu")).toContainText("Общее пространство", { timeout: 500 });
    } finally {
      await q.keyboard.press("Escape");
    }
  }).toPass({ timeout: FAST });
  await openSwitcher(q);
  await q.getByRole("menuitemcheckbox", { name: /Общее пространство/ }).or(q.getByRole("menuitem", { name: /Общее пространство/ })).first().click();
  await expect(docRow(q, "Первая общая")).toBeVisible({ timeout: FAST });

  // A writes a new note: B sees it in the list and opens it in seconds.
  await typeNewNote(page, "Вторая общая", "ещё текст владельца");
  await expect(docRow(q, "Вторая общая")).toBeVisible({ timeout: FAST });
  await docRow(q, "Вторая общая").click();
  await expect(q.locator(".ds-prose")).toContainText("ещё текст владельца", { timeout: FAST });

  // B writes in the shared notebook: no «waiting for a key», it is sent, and A opens it.
  await typeNewNote(q, "От участника", "текст участника");
  await expect(q.getByText("Ждёт ключ")).toHaveCount(0);
  await page.getByRole("link", { name: /Все документы|All documents/ }).first().click();
  await expect(docRow(page, "От участника")).toBeVisible({ timeout: FAST });
  await docRow(page, "От участника").click();
  await expect(page.locator(".ds-prose")).toContainText("текст участника", { timeout: FAST });

  // «Синхронизация…» settles on both sides.
  await expectSynced(page);
  await expectSynced(q);
  await fc.close();
});
