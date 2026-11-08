import { beforeEach, describe, expect, it } from "vitest";
import { browserInfo, buildReport, clearDiag, recordDiag, safeCode, useDiagnostics, type DiagSnapshot } from "./diagnostics";

const base: DiagSnapshot = {
  version: "1.2.3",
  browser: { name: "Chrome", version: "140", os: "macOS" },
  now: Date.parse("2026-11-08T10:00:00Z"),
  connection: "online",
  lastSyncedAt: Date.parse("2026-11-08T09:59:00Z"),
  outbox: 2,
  notSent: [{ docId: "01J9Z0ABCDEF", code: "forbidden: Note «Секретный план» is not yours" }],
  unreadable: [{ docId: "01J9Z0XYZ123", count: 3 }],
  keys: { available: 2, total: 3 },
  uploads: { waiting: 1, done: 1, total: 2 },
  storage: { usedMb: 12.5, quotaMb: 2048, persisted: false },
  storageFull: false,
  check: { at: Date.parse("2026-11-08T09:59:30Z"), serverOk: true, serverMs: 42, notSynced: 0 },
  entries: [{ at: Date.parse("2026-11-08T09:58:00Z"), code: "decrypt_failed", docId: "01J9Z0XYZ123" }],
};

describe("diagnostics report", () => {
  it("lists codes, ids, counts, times, the version and the browser", () => {
    const r = buildReport(base);
    expect(r).toContain("app: web 1.2.3");
    expect(r).toContain("browser: Chrome 140 · macOS");
    expect(r).toContain("time: 2026-11-08T10:00:00.000Z");
    expect(r).toContain("not sent: 01J9Z0ABCDEF (forbidden)");
    expect(r).toContain("unreadable: 01J9Z0XYZ123 ×3");
    expect(r).toContain("keys: 2/3");
    expect(r).toContain("2026-11-08T09:58:00.000Z decrypt_failed 01J9Z0XYZ123");
  });

  it("never carries a message: only the code before it", () => {
    const r = buildReport(base);
    expect(r).not.toContain("Секретный");
    expect(r).not.toContain("is not yours");
    // Nothing but ASCII words, numbers, ids, ISO times and a little punctuation.
    for (const line of r.split("\n")) expect(line).toMatch(/^[\w .,:;/()×·—+-]*$/);
  });

  it("keeps identifier-like codes only", () => {
    expect(safeCode("forbidden: anything at all")).toBe("forbidden");
    expect(safeCode("Заметка «план»")).toBe("error");
    expect(safeCode("user@example.com")).toBe("error");
  });
});

describe("diagnostics log", () => {
  beforeEach(() => clearDiag());

  it("records codes and id-like documents, and folds a repeat within a minute", () => {
    recordDiag("internal: stack trace with secrets", "01J9Z0ABCDEF", 1_000);
    recordDiag("internal", "01J9Z0ABCDEF", 30_000);
    recordDiag("offline", "not an id!", 200_000);
    expect(useDiagnostics.getState().entries).toEqual([
      { at: 1_000, code: "internal", docId: "01J9Z0ABCDEF" },
      { at: 200_000, code: "offline" },
    ]);
    expect(JSON.parse(localStorage.getItem("ds.diag.log")!)).toHaveLength(2);
  });
});

describe("browser info", () => {
  it.each([
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36", "Chrome", "140", "macOS"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0", "Edge", "139", "Windows"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1", "Safari", "26.0", "iOS"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0", "Firefox", "142", "Linux"],
  ])("%s", (ua, name, version, os) => {
    expect(browserInfo(ua)).toEqual({ name, version, os });
  });
});
