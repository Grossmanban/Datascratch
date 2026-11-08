import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { expectSynced, newDoc, PASSWORD, signUp, uniqueEmail } from "./helpers";

// spec/10: settings with a section list (keyboard, phone layout, both themes) and
// «Синхронизация и диагностика» with a report that carries no secrets.

const MOCK = "http://localhost:8787";
const SECTIONS = [
  ["account", "Аккаунт"],
  ["appearance", "Внешний вид"],
  ["sync", "Синхронизация и диагностика"],
  ["security", "Безопасность и устройства"],
  ["agents", "Агенты ИИ"],
  ["notebooks", "Блокноты"],
  ["about", "О приложении"],
] as const;

async function contrast(page: Page, label: string) {
  const axe = await new AxeBuilder({ page }).include("[data-testid=settings]").withRules(["color-contrast"]).analyze();
  expect(axe.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(" ")}: ${n.failureSummary}`)), label).toEqual([]);
}

test("every section in light and dark, readable, reached by the list and the keyboard", async ({ page }) => {
  await signUp(page, uniqueEmail("settings"));
  // The settings button: a large target of its own, not beside the trash.
  const button = page.getByTestId("settings-link");
  const box = (await button.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(40);
  expect(box.width).toBeGreaterThanOrEqual(120);
  await expect(page.getByTestId("sidebar").locator("div.border-t").filter({ has: button }).getByRole("link", { name: "Корзина" })).toHaveCount(0);
  await button.click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByTestId("settings")).toHaveAttribute("data-section", "account");

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const [id, title] of SECTIONS) {
      await page.getByTestId("settings-nav").getByRole("link", { name: title }).click();
      await expect(page).toHaveURL(new RegExp(`/settings/${id}$`));
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByTestId(`settings-${id}`)).toBeVisible();
      await page.waitForTimeout(150); // let the section's own queries settle
      await contrast(page, `${id} (${scheme})`);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });

  // Keyboard: arrows walk the list, Enter opens a section.
  const nav = page.getByTestId("settings-nav");
  await nav.getByRole("link", { name: "Аккаунт" }).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(nav.getByRole("link", { name: "Синхронизация и диагностика" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(nav.getByRole("link", { name: "О приложении" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(nav.getByRole("link", { name: "Аккаунт" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/settings\/about$/);
  // The theme previews are one radio group: arrows choose.
  await page.goto("/settings/appearance");
  await page.getByRole("radio", { name: "Как в системе" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("radio", { name: "Тёмная" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Как в системе" })).toHaveAttribute("aria-checked", "true");
  // ⌘, opens the settings from anywhere.
  await page.goto("/all");
  await page.keyboard.press("ControlOrMeta+Comma");
  await expect(page).toHaveURL(/\/settings$/);
});

test("on a phone the list is a screen of its own and a section has a way back", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ru-RU", hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await signUp(page, uniqueEmail("settings-phone"));
  await page.goto("/settings");
  const nav = page.getByTestId("settings-nav");
  await expect(nav).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeHidden();
  for (const [, title] of SECTIONS) {
    const link = nav.getByRole("link", { name: title });
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await nav.getByRole("link", { name: "Синхронизация и диагностика" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Синхронизация и диагностика" })).toBeVisible();
  await expect(nav).toBeHidden();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, "no sideways scroll").toBeLessThanOrEqual(390);
  await page.getByTestId("settings-back").click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(nav).toBeVisible();
  await ctx.close();
});

test("diagnostics: state, a check, explained errors, and a copied report without secrets", async ({ page, context, request }) => {
  test.skip(!!process.env.E2E_SERVER_URL, "refuses pushes through the mock server");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const email = uniqueEmail("diag-report");
  const key = await signUp(page, email);
  const title = "Секретный план Ω";
  await newDoc(page, title, "Текст, который никто не должен увидеть");
  await expectSynced(page);
  const docId = new URL(page.url()).pathname.split("/").pop()!;

  // A change the server refuses: «Не отправлено», then an explained error with the document id.
  await request.post(`${MOCK}/v1/__test/refuse-pushes`, { data: { on: true } });
  try {
    await page.keyboard.type(" и ещё строка");
    await expect(page.getByTestId("sync-status")).toHaveAttribute("data-status", "not-sent", { timeout: 15_000 });
    await page.goto("/settings/sync");
    await expect(page.getByTestId("diag-outbox")).toHaveAttribute("data-tone", "bad");
    const error = page.getByTestId("diag-error").first();
    await expect(error).toBeVisible();
    await expect(error.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d\d-\d\dT/);
    await expect(error).not.toContainText(/Ошибка синхронизации «/); // a known code, explained

    await page.getByTestId("diag-check").click();
    await expect(page.getByTestId("diag-check-result")).toHaveAttribute("data-server", "ok");

    // The refused document reaches «не отправлено» on its own time: copy until it is listed.
    let report = "";
    await expect
      .poll(
        async () => {
          await page.getByTestId("diag-copy").click();
          report = await page.evaluate(() => navigator.clipboard.readText());
          return report;
        },
        { timeout: 15_000 },
      )
      .toContain(docId);
    await expect(page.getByText("Отчёт скопирован").first()).toBeVisible();
    expect(report).toContain("Datascratch diagnostics");
    expect(report).toMatch(/^app: web \S+/m);
    expect(report).toMatch(/^browser: Chrome \d+/m);
    expect(report).toMatch(new RegExp(`^not sent: .*${docId} \\(`, "m"));
    expect(report).toMatch(/^check: \S+ server ok \d+ ms/m);
    for (const secret of [email, email.split("@")[0]!, title, "Секретный", "никто не должен", "Заметки", key, key.replace(/-/g, ""), PASSWORD]) {
      expect(report, `the report must not contain «${secret}»`).not.toContain(secret);
    }
    // Only ids, codes, numbers, ISO times and a little punctuation.
    for (const line of report.split("\n")) expect(line).toMatch(/^[\w .,:;/()×·—+-]*$/);
  } finally {
    await request.post(`${MOCK}/v1/__test/refuse-pushes`, { data: { on: false } });
  }
  await page.getByTestId("diag-resend").click();
});
