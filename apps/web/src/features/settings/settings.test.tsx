import "@/i18n";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { UIProvider } from "@/ui";
import { openAccountDb } from "@/data/db";
import { setLang } from "@/i18n";
import { useTheme } from "@/lib/theme";
import { useSyncStatus } from "@/sync/engine";
import { AboutSection } from "./AboutSection";
import { AppearanceSection } from "./AppearanceSection";
import { DiagnosticsSection } from "./DiagnosticsSection";
import { clearDiag, recordDiag } from "./diagnostics";

// Component tests of the settings sections (spec/10), in both themes.
const THEMES = ["light", "dark"] as const;

beforeAll(() => {
  openAccountDb("ct-settings");
  setLang("ru");
});
afterEach(cleanup);

const mount = (node: React.ReactNode) => render(<UIProvider locale="ru">{node}</UIProvider>);

describe.each(THEMES)("settings sections · %s", (theme) => {
  beforeEach(() => {
    document.documentElement.dataset.theme = theme;
    clearDiag();
    useSyncStatus.setState({ status: "online", pending: 0, lastSyncedAt: Date.now(), error: null, failed: {}, skipped: {}, storageFull: false });
  });

  it("Внешний вид: three theme previews as a radio group; arrows choose", () => {
    useTheme.setState({ pref: "system" });
    mount(<AppearanceSection />);
    const group = screen.getByRole("radiogroup", { name: "Тема" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(["Светлая", "Тёмная", "Как в системе"]);
    expect(within(group).getByRole("radio", { checked: true })?.textContent).toContain("Как в системе");
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(useTheme.getState().pref).toBe("dark");
    expect(within(group).getByRole("radio", { checked: true })?.textContent).toContain("Тёмная");
    useTheme.setState({ pref: "system" });
  });

  it("Синхронизация и диагностика: state tiles follow the sync status", () => {
    useSyncStatus.setState({ status: "offline", pending: 3, failed: { "01J9Z0ABCDEF": { code: "forbidden", reason: "x" } }, skipped: { "01J9Z0XYZ123": 2 } });
    mount(<DiagnosticsSection />);
    expect(screen.getByTestId("diag-connection")?.getAttribute("data-state")).toBe("offline");
    expect(screen.getByTestId("diag-connection")?.textContent).toContain("Нет сети");
    expect(screen.getByTestId("diag-outbox")?.textContent).toContain("3 изменения ждут");
    expect(screen.getByTestId("diag-outbox")?.textContent).toContain("1 документ не принят сервером");
    expect(screen.getByTestId("diag-outbox")?.getAttribute("data-tone")).toBe("bad");
    expect(screen.getByTestId("diag-keys")?.textContent).toContain("1 документ читается не целиком");
    expect(screen.getByTestId("diag-resend")).toBeTruthy();
  });

  it("recent errors: time, a human explanation and the code", () => {
    recordDiag("forbidden", "01J9Z0ABCDEF", Date.parse("2026-11-08T09:00:00Z"));
    recordDiag("client_TypeError", undefined, Date.parse("2026-11-08T09:05:00Z"));
    recordDiag("weird_code", undefined, Date.parse("2026-11-08T09:10:00Z"));
    mount(<DiagnosticsSection />);
    const rows = screen.getAllByTestId("diag-error");
    expect(rows.map((r) => r.dataset.code)).toEqual(["weird_code", "client_TypeError", "forbidden"]);
    expect(rows[2]?.textContent).toContain("у этого аккаунта больше нет прав на документ");
    expect(rows[2]?.textContent).toContain("документ 01J9Z0AB");
    expect(rows[1]?.textContent).toContain("Внутренняя ошибка приложения (TypeError)");
    expect(rows[0]?.textContent).toContain("Ошибка синхронизации «weird_code»");
    expect(rows[2]!.querySelector("time")?.getAttribute("datetime")).toBe("2026-11-08T09:00:00.000Z");
  });

  it("«Проверить сейчас» asks the server and shows the answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } })));
    mount(<DiagnosticsSection />);
    await act(async () => fireEvent.click(screen.getByTestId("diag-check")));
    await waitFor(() => expect(screen.getByTestId("diag-check-result")?.getAttribute("data-server")).toBe("ok"));
    expect(screen.getByTestId("diag-check-result")?.textContent).toContain("Сервер отвечает");
    vi.unstubAllGlobals();
  });

  it("«Скопировать отчёт» copies codes and ids, not messages", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    useSyncStatus.setState({ error: "internal: Заметка «Отпуск» сломалась", failed: { "01J9Z0ABCDEF": { code: "forbidden", reason: "Отпуск" } } });
    recordDiag("internal: Заметка «Отпуск» сломалась");
    mount(<DiagnosticsSection />);
    await act(async () => fireEvent.click(screen.getByTestId("diag-copy")));
    const text = writeText.mock.calls[0]![0] as string;
    expect(text).toContain("Datascratch diagnostics");
    expect(text).toContain("01J9Z0ABCDEF (forbidden)");
    expect(text).toContain(" internal");
    expect(text).not.toMatch(/Отпуск|Заметка/);
  });

  it("О приложении: the mark, version and browser", () => {
    mount(<AboutSection />);
    expect(screen.getByTestId("about-version")?.textContent).toMatch(/Версия \d/);
    expect(screen.getByText("Браузер")).toBeTruthy();
    expect(screen.getByText("Сочетания клавиш")).toBeTruthy();
  });
});
