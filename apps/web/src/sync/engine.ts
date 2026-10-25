import type { SyncStatus as ClientStatus } from "@datascratch/shared";
import { create } from "zustand";

/** What the UI shows (sync indicator); derived from SyncClient's status and per-doc sync. */
export type SyncStatus = "offline" | "connecting" | "syncing" | "online";

type SyncState = { status: SyncStatus; pending: number; lastSyncedAt: number | null; error: string | null };

export function createSyncStatusStore() {
  return create<SyncState>(() => ({ status: "offline", pending: 0, lastSyncedAt: null, error: null }));
}
export type SyncStatusStore = ReturnType<typeof createSyncStatusStore>;

export const useSyncStatus = createSyncStatusStore();

export function uiStatus(client: ClientStatus, allSynced: boolean): SyncStatus {
  if (client === "online") return allSynced ? "online" : "syncing";
  if (client === "connecting") return "connecting";
  return "offline";
}
