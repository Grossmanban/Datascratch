import { expect, test, type Page } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

// D-65 «Голос», phase 1 (spec/04 «Голос»): dictation into a note and «Оформить», against the mock
// server's voice endpoints. The microphone is a WebAudio tone (works in Chromium and WebKit).

const MOCK = "http://localhost:8787";

/** A fake microphone; with `deny` the browser refuses it as when permission is denied. */
async function fakeMic(page: Page, deny = false) {
  await page.addInitScript((denied) => {
    const md = navigator.mediaDevices ?? ((navigator as unknown as { mediaDevices: MediaDevices }).mediaDevices = {} as MediaDevices);
    md.getUserMedia = async () => {
      if (denied) throw new DOMException("Permission denied", "NotAllowedError");
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.frequency.value = 220;
      const dst = ctx.createMediaStreamDestination();
      osc.connect(dst);
      osc.start();
      return dst.stream;
    };
  }, deny);
}

async function voiceMock(page: Page, body: object) {
  await page.request.post(`${MOCK}/__mock/voice`, { data: body });
}

const body = (p: Page) => p.locator(".ds-prose");

/** Tap to start, speak a while, tap to stop. */
async function tapTake(p: Page, ms = 1200) {
  const mic = p.getByTestId("mic-button");
  await mic.click();
  await expect(mic).toHaveAttribute("data-phase", "listening");
  await expect(p.getByTestId("mic-status")).toContainText("Слушаю…");
  await p.waitForTimeout(ms);
  await mic.click();
}

test.describe.configure({ mode: "serial" });

test("dictation: consent once, tap and hold, takes in order, Esc cancels, errors are plain", async ({ page }) => {
  test.skip(!!process.env.E2E_SERVER_URL, "mock server only (voice providers stand-in)");
  test.setTimeout(120_000);
  await fakeMic(page);
  await voiceMock(page, { reset: true, fail: null });
  await signUp(page, uniqueEmail("voice"));
  await newDoc(page, "Голосовая заметка", "Начало.");

  // First use: where the audio goes; «Не сейчас» does not listen.
  await page.getByTestId("mic-button").click();
  await expect(page.getByTestId("voice-consent")).toContainText("ElevenLabs и OpenAI");
  await page.getByTestId("voice-consent-decline").click();
  await expect(page.getByTestId("mic-button")).toHaveAttribute("data-phase", "idle");
  await page.getByTestId("mic-button").click();
  await page.getByTestId("voice-consent-accept").click();
  await expect(page.getByTestId("mic-button")).toHaveAttribute("data-phase", "listening");
  await page.waitForTimeout(1200);
  await page.getByTestId("mic-button").click();
  // The tidy text lands at the caret: fillers gone, a capital, a full stop.
  await expect(body(page)).toContainText("Фраза номер 1 сказанная вслух.", { timeout: 15_000 });
  await expect(body(page)).not.toContainText("эээ");

  // Hold to talk: pressed, spoken, released.
  const mic = page.getByTestId("mic-button");
  const box = (await mic.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(mic).toHaveAttribute("data-phase", "listening");
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await expect(body(page)).toContainText("Фраза номер 2", { timeout: 15_000 });

  // Two takes in a row: each lands in order.
  await tapTake(page);
  await tapTake(page);
  await expect(body(page)).toContainText("Фраза номер 4", { timeout: 20_000 });
  const text = (await body(page).innerText()).replace(/\s+/g, " ");
  expect(text.indexOf("Фраза номер 3")).toBeLessThan(text.indexOf("Фраза номер 4"));
  await expect(mic).toHaveAttribute("data-phase", "idle");

  // ⌥M starts and stops from the keyboard; Esc drops the take.
  await page.keyboard.press("Alt+KeyM");
  await expect(mic).toHaveAttribute("data-phase", "listening");
  await page.keyboard.press("Escape");
  await expect(mic).toHaveAttribute("data-phase", "idle");
  await page.waitForTimeout(800);
  await expect(body(page)).not.toContainText("Фраза номер 5");

  // A plain message when the service says no.
  await voiceMock(page, { fail: { status: 429, code: "voice_quota" } });
  await tapTake(page);
  await expect(page.getByTestId("mic-status")).toContainText("Лимит голоса на этот месяц исчерпан", { timeout: 15_000 });
  await voiceMock(page, { fail: null });

  // Consent is remembered (account settings): no window after a reload.
  await page.reload();
  await page.getByTestId("mic-button").click();
  await expect(page.getByTestId("mic-button")).toHaveAttribute("data-phase", "listening");
  await expect(page.getByTestId("voice-consent")).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("dictation: a denied microphone says how to allow it", async ({ page }) => {
  test.skip(!!process.env.E2E_SERVER_URL, "mock server only");
  await fakeMic(page, true);
  await signUp(page, uniqueEmail("voice-denied"));
  await newDoc(page, "Без микрофона", "Текст");
  await page.getByTestId("mic-button").click();
  await page.getByTestId("voice-consent-accept").click();
  await expect(page.getByTestId("mic-status")).toContainText("Нет доступа к микрофону", { timeout: 10_000 });
  await expect(page.getByTestId("mic-button")).toHaveAttribute("data-phase", "idle");
});

test("«Оформить»: a style, the note tidied as a highlighted edit, the draft folded below, undo", async ({ page }) => {
  test.skip(!!process.env.E2E_SERVER_URL, "mock server only");
  await signUp(page, uniqueEmail("voice-format"));
  await newDoc(page, "Черновик", "первое предложение. второе предложение.");
  await page.getByRole("button", { name: "Ещё", exact: true }).click();
  await page.getByRole("menuitem", { name: "Оформить…" }).click();
  await expect(page.getByTestId("format-dialog")).toBeVisible();
  // «Документ» is the default; «План» chosen here.
  await expect(page.getByTestId("format-style-document")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("format-style-plan").click();
  await page.getByTestId("format-run").click();
  await expect(page.getByTestId("format-dialog")).toHaveCount(0, { timeout: 15_000 });
  await expect(body(page).locator("h2")).toContainText("Оформлено (plan)");
  await expect(body(page).locator("li")).toHaveCount(2);
  // Highlighted like an agent's edit, authored by voice.
  await expect(body(page).locator('.ds-agent-edit[data-agent-id="voice"]').first()).toBeVisible();
  // The original text from the banner; «Отклонить» brings it back.
  await page.getByTestId("format-draft-toggle").click();
  await expect(page.getByTestId("format-draft")).toContainText("первое предложение. второе предложение.");
  await page.getByTestId("format-undo").click();
  await expect(body(page)).toContainText("первое предложение. второе предложение.");
  await expect(body(page).locator("h2")).toHaveCount(0);
});

test("settings → «Голос»: quality and profanity are kept", async ({ page }) => {
  await signUp(page, uniqueEmail("voice-settings"));
  await page.goto("/settings/voice");
  await expect(page.getByTestId("settings-voice")).toBeVisible();
  await expect(page.getByTestId("voice-left")).toContainText("Осталось в этом месяце: 120 мин");
  const opt = (name: string) => page.getByRole("radio", { name }).or(page.getByRole("button", { name })).first();
  await opt("Лучшее").click();
  await opt("Оставлять как есть").click();
  await page.reload();
  await expect(opt("Лучшее")).toHaveAttribute("aria-checked", "true");
  await expect(opt("Оставлять как есть")).toHaveAttribute("aria-checked", "true");
  // Not the server admin: no «Кто может пользоваться».
  await expect(page.getByTestId("admin-voice")).toHaveCount(0);
});

test("the server admin turns voice on for an account: its button comes alive without a reload", async ({ page, browser }) => {
  test.skip(!!process.env.E2E_SERVER_URL, "mock server only (who is admin is a server setting)");
  test.setTimeout(120_000);
  const member = uniqueEmail("novoice");
  const mc = await browser.newContext({ ...test.info().project.use });
  const q = await mc.newPage();
  await fakeMic(q);
  await signUp(q, member);
  await newDoc(q, "Без голоса", "Текст");
  const mic = q.getByTestId("mic-button");
  await expect(mic).toHaveAttribute("data-off", "true");
  await q.getByRole("button", { name: "Ещё", exact: true }).click();
  await expect(q.getByRole("menuitem", { name: "История версий" })).toBeVisible();
  await expect(q.getByRole("menuitem", { name: "Оформить…" })).toHaveCount(0);
  await q.keyboard.press("Escape");

  await signUp(page, uniqueEmail("voiceadmin"));
  await page.goto("/settings/voice");
  const row = page.getByTestId("admin-voice-row").filter({ hasText: member });
  await expect(row).toBeVisible();
  await expect(page.getByTestId("admin-voice-total")).toContainText("В этом месяце");
  await row.getByTestId("admin-voice-limit").fill("300");
  await row.getByTestId("admin-voice-limit").press("Enter");
  await row.getByRole("switch").click();
  await expect(row.getByRole("switch")).toHaveAttribute("aria-checked", "true");

  // account_changed «voice» → the member's client reads /voice/me again: the button is on.
  await expect(mic).not.toHaveAttribute("data-off", "true", { timeout: 5_000 });
  await q.goto("/settings/voice");
  await expect(q.getByTestId("voice-left")).toContainText("Осталось в этом месяце: 300 мин");
  await mc.close();
});
