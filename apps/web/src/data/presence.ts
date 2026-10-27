import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import type * as Y from "yjs";
import { sanitizeAwarenessUpdate } from "./awarenessSanitize";

export type PresenceUser = { name: string; color: string; kind: "user" | "guest" };

/** Sends a y-protocols awareness update; SyncClient encrypts it (ds1|awareness|<docId>). */
export type PresenceSend = (update: Uint8Array) => void;

const channels = new Map<string, Awareness>();

const COLORS = ["#2E5BDB", "#D2453B", "#3E8E5A", "#7A4FD6", "#C98A1B", "#1F7F80", "#C23F7A"];
export const colorFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length]!;
};

/** Presence over the sync socket (never stored by the server). */
export function joinPresence(docId: string, doc: Y.Doc, user: PresenceUser, send: PresenceSend): { awareness: Awareness; leave: () => void } {
  const awareness = new Awareness(doc);
  awareness.setLocalStateField("user", user);
  channels.set(docId, awareness);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pendingClients = new Set<number>();
  const onUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    if (origin === "remote") return;
    for (const c of [...added, ...updated, ...removed]) pendingClients.add(c);
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      const clients = [...pendingClients];
      pendingClients.clear();
      send(encodeAwarenessUpdate(awareness, clients));
    }, 60);
  };
  awareness.on("update", onUpdate);
  // Re-announce periodically so late joiners see us (awareness has a 30 s timeout).
  const heartbeat = setInterval(() => awareness.setLocalStateField("ts", Date.now()), 15_000);
  return {
    awareness,
    leave: () => {
      clearInterval(heartbeat);
      if (timer) clearTimeout(timer);
      awareness.off("update", onUpdate);
      removeAwarenessStates(awareness, [doc.clientID], "local");
      send(encodeAwarenessUpdate(awareness, [doc.clientID]));
      awareness.destroy();
      if (channels.get(docId) === awareness) channels.delete(docId);
    },
  };
}

/** A decrypted awareness update arrived from another device or guest. */
export function receivePresence(docId: string, update: Uint8Array) {
  const awareness = channels.get(docId);
  if (!awareness) return;
  try {
    // The user's name and color are checked before the editor can show them (audit 2026-10-27).
    applyAwarenessUpdate(awareness, sanitizeAwarenessUpdate(update), "remote");
  } catch {
    // ignore malformed presence
  }
}
