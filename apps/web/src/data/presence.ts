import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import type * as Y from "yjs";
import { ad, fromBase64Url, open, seal, toBase64Url } from "@/lib/shared";

export type PresenceUser = { name: string; color: string; kind: "user" | "guest" };

type Channel = {
  awareness: Awareness;
  key: () => Promise<Uint8Array | null>;
  send: (payload: string) => void;
};

const channels = new Map<string, Channel>();

const COLORS = ["#2E5BDB", "#D2453B", "#3E8E5A", "#7A4FD6", "#C98A1B", "#1F7F80", "#C23F7A"];
export const colorFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length]!;
};

/**
 * Presence over the sync socket (sync-protocol.md: `awareness`, encrypted with the doc key,
 * ad = ds1|awareness|<docId>, never stored by the server).
 */
export function joinPresence(
  docId: string,
  doc: Y.Doc,
  user: PresenceUser,
  key: () => Promise<Uint8Array | null>,
  send: (payload: string) => void,
): { awareness: Awareness; leave: () => void } {
  const awareness = new Awareness(doc);
  awareness.setLocalStateField("user", user);
  const ch: Channel = { awareness, key, send };
  channels.set(docId, ch);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pendingClients = new Set<number>();
  const onUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    if (origin === "remote") return;
    for (const c of [...added, ...updated, ...removed]) pendingClients.add(c);
    if (timer) return;
    timer = setTimeout(async () => {
      timer = null;
      const clients = [...pendingClients];
      pendingClients.clear();
      const k = await key();
      if (!k) return;
      const update = encodeAwarenessUpdate(awareness, clients);
      send(toBase64Url(await seal(k, update, ad.awareness(docId))));
    }, 60);
  };
  awareness.on("update", onUpdate);
  // Re-announce periodically so late joiners see us (awareness has a 30 s timeout).
  const heartbeat = setInterval(() => awareness.setLocalStateField("ts", Date.now()), 15_000);
  return {
    awareness,
    leave: () => {
      clearInterval(heartbeat);
      removeAwarenessStates(awareness, [doc.clientID], "local");
      awareness.off("update", onUpdate);
      if (timer) clearTimeout(timer);
      // Send the "left" state right away.
      void key().then(async (k) => {
        if (!k) return;
        const update = encodeAwarenessUpdate(awareness, [doc.clientID]);
        send(toBase64Url(await seal(k, update, ad.awareness(docId))));
        awareness.destroy();
      });
      if (channels.get(docId) === ch) channels.delete(docId);
    },
  };
}

export async function receivePresence(docId: string, payload: string) {
  const ch = channels.get(docId);
  if (!ch) return;
  const k = await ch.key();
  if (!k) return;
  try {
    applyAwarenessUpdate(ch.awareness, await open(k, fromBase64Url(payload), ad.awareness(docId)), "remote");
  } catch {
    // ignore undecryptable presence
  }
}
