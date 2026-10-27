import type { SyncStatus as ClientStatus } from "@datascratch/shared";
import { create } from "zustand";

/** What the UI shows (sync indicator); derived from SyncClient's status and per-doc sync. */
export type SyncStatus = "offline" | "connecting" | "syncing" | "online";

/** A document whose changes the server refused (shown as «Не отправлено: N» with a retry). */
export type SyncFailure = { code: string; reason: string };

type SyncState = {
  status: SyncStatus;
  pending: number;
  lastSyncedAt: number | null;
  error: string | null;
  failed: Record<string, SyncFailure>;
  /** Server items this device could not read, per document (skipped; the rest keeps syncing). */
  skipped: Record<string, number>;
  /** The browser storage refuses writes (quota): edits wait in memory, not saved on this device. */
  storageFull: boolean;
};

export function createSyncStatusStore() {
  return create<SyncState>(() => ({ status: "offline", pending: 0, lastSyncedAt: null, error: null, failed: {}, skipped: {}, storageFull: false }));
}
export type SyncStatusStore = ReturnType<typeof createSyncStatusStore>;

export const useSyncStatus = createSyncStatusStore();

export function uiStatus(client: ClientStatus, allSynced: boolean): SyncStatus {
  if (client === "online") return allSynced ? "online" : "syncing";
  if (client === "connecting") return "connecting";
  return "offline";
}
