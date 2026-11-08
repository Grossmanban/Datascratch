import { create } from "zustand";
import { useSyncStatus } from "@/sync/engine";

/**
 * Diagnostics for «Синхронизация и диагностика» (spec/10): a short log of what went wrong,
 * and the report the user can copy for support. Everything here is codes, document ids,
 * timestamps, counts, the app version and the browser: never note text, names, e-mail or keys.
 */

export type DiagEntry = {
  /** Epoch ms. */
  at: number;
  /** A sync or API error code (forbidden, decrypt_failed, …) or one of the app's own codes. */
  code: string;
  /** The document it concerns, when there is one (an id, never a title). */
  docId?: string;
};

const KEY = "ds.diag.log";
const MAX = 40;

function load(): DiagEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter(isEntry).slice(-MAX) : [];
  } catch {
    return [];
  }
}

function isEntry(e: unknown): e is DiagEntry {
  const v = e as DiagEntry;
  return !!v && typeof v.at === "number" && typeof v.code === "string" && (v.docId === undefined || typeof v.docId === "string");
}

export const useDiagnostics = create<{ entries: DiagEntry[] }>(() => ({ entries: load() }));

/** Only an identifier-like code is kept (an error message could carry anything). */
export function safeCode(raw: string): string {
  const code = raw.split(":")[0]!.trim();
  return /^[a-z][a-z0-9_.-]{0,40}$/i.test(code) ? code : "error";
}

/** Only an id-like value is kept as the document (uuid, ulid, short ids). */
function safeDocId(raw: string | undefined): string | undefined {
  return raw && /^[A-Za-z0-9_-]{6,64}$/.test(raw) ? raw : undefined;
}

export function recordDiag(code: string, docId?: string, at = Date.now()) {
  const entry: DiagEntry = { at, code: safeCode(code), ...(safeDocId(docId) ? { docId: safeDocId(docId) } : {}) };
  const prev = useDiagnostics.getState().entries;
  // The same error repeating within a minute is one line, not a flood.
  const last = prev[prev.length - 1];
  if (last && last.code === entry.code && last.docId === entry.docId && at - last.at < 60_000) return;
  const entries = [...prev, entry].slice(-MAX);
  useDiagnostics.setState({ entries });
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // storage full or blocked: the log stays in memory
  }
}

export function clearDiag() {
  useDiagnostics.setState({ entries: [] });
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

let started = false;

/**
 * Starts recording: watches the sync status (read only) and uncaught errors. Called once at
 * app start, so errors from before the settings were opened are there too.
 */
export function startDiagnostics() {
  if (started) return;
  started = true;
  useSyncStatus.subscribe((s, p) => {
    if (s.error && s.error !== p.error) recordDiag(s.error);
    for (const [docId, f] of Object.entries(s.failed)) if (!p.failed[docId]) recordDiag(f.code, docId);
    for (const [docId, n] of Object.entries(s.skipped)) if (n > (p.skipped[docId] ?? 0)) recordDiag("unreadable", docId);
    if (s.storageFull && !p.storageFull) recordDiag("storage_full");
    if (s.status === "offline" && p.status !== "offline" && p.status !== "connecting") recordDiag("offline");
  });
  window.addEventListener("error", (e) => {
    // A resource that failed to load is the boot watchdog's business; script errors are logged by name only.
    if (e.error instanceof Error) recordDiag(`client_${e.error.name}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as unknown;
    recordDiag(r instanceof Error ? `client_${r.name}` : "client_rejection");
  });
}

// ---------- report ----------

export type BrowserInfo = { name: string; version: string; os: string };

export function browserInfo(ua = navigator.userAgent): BrowserInfo {
  const pick = (re: RegExp) => ua.match(re)?.[1] ?? "";
  let name = "Browser";
  let version = "";
  if (/Edg\//.test(ua)) [name, version] = ["Edge", pick(/Edg\/(\d+)/)];
  else if (/Firefox\//.test(ua)) [name, version] = ["Firefox", pick(/Firefox\/(\d+)/)];
  else if (/Chrome\//.test(ua)) [name, version] = ["Chrome", pick(/Chrome\/(\d+)/)];
  else if (/Safari\//.test(ua)) [name, version] = ["Safari", pick(/Version\/(\d+(?:\.\d+)?)/)];
  const os = /iPhone/.test(ua)
    ? "iOS"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1)
      ? "iPadOS"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Android/.test(ua)
            ? "Android"
            : /Linux/.test(ua)
              ? "Linux"
              : "Other";
  return { name, version, os };
}

export type DiagSnapshot = {
  version: string;
  browser: BrowserInfo;
  now: number;
  connection: string;
  lastSyncedAt: number | null;
  outbox: number;
  notSent: { docId: string; code: string }[];
  unreadable: { docId: string; count: number }[];
  keys: { available: number; total: number };
  uploads: { waiting: number; done: number; total: number };
  storage: { usedMb: number; quotaMb: number; persisted: boolean | null } | null;
  storageFull: boolean;
  check: { at: number; serverOk: boolean; serverMs: number | null; notSynced: number } | null;
  entries: DiagEntry[];
};

const iso = (ms: number) => new Date(ms).toISOString();

/** Plain text for support. Ids, codes, counts and times only (see the type). */
export function buildReport(s: DiagSnapshot): string {
  const lines = [
    "Datascratch diagnostics",
    `app: web ${s.version}`,
    `browser: ${s.browser.name} ${s.browser.version} · ${s.browser.os}`,
    `time: ${iso(s.now)}`,
    `connection: ${s.connection}`,
    `last sync: ${s.lastSyncedAt ? iso(s.lastSyncedAt) : "—"}`,
    `outbox: ${s.outbox}`,
    `not sent: ${s.notSent.length ? s.notSent.map((f) => `${f.docId} (${safeCode(f.code)})`).join(", ") : "0"}`,
    `unreadable: ${s.unreadable.length ? s.unreadable.map((u) => `${u.docId} ×${u.count}`).join(", ") : "0"}`,
    `keys: ${s.keys.available}/${s.keys.total}`,
    `uploads: waiting ${s.uploads.waiting}, batch ${s.uploads.done}/${s.uploads.total}`,
    `storage: ${s.storage ? `${s.storage.usedMb} MB of ${s.storage.quotaMb} MB, persisted ${s.storage.persisted ?? "unknown"}` : "unknown"}${s.storageFull ? " · FULL" : ""}`,
    `check: ${s.check ? `${iso(s.check.at)} server ${s.check.serverOk ? `ok ${s.check.serverMs} ms` : "unreachable"}, not synced ${s.check.notSynced}` : "not run"}`,
    "",
    `recent errors (${s.entries.length}):`,
    ...(s.entries.length ? [...s.entries].reverse().map((e) => `${iso(e.at)} ${safeCode(e.code)}${e.docId ? ` ${e.docId}` : ""}`) : ["none"]),
  ];
  return lines.join("\n");
}
