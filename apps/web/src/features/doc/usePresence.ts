import { useEffect, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { joinPresence, type PresenceUser } from "@/data/presence";

export function usePresence(
  docId: string,
  doc: Y.Doc | null,
  user: PresenceUser,
  key: () => Promise<Uint8Array | null>,
  send: (payload: string) => void,
) {
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [others, setOthers] = useState<PresenceUser[]>([]);
  useEffect(() => {
    if (!doc) return;
    const p = joinPresence(docId, doc, user, key, send);
    setAwareness(p.awareness);
    const refresh = () => {
      const list: PresenceUser[] = [];
      p.awareness.getStates().forEach((st, clientId) => {
        if (clientId !== doc.clientID && st.user) list.push(st.user as PresenceUser);
      });
      setOthers(list);
    };
    p.awareness.on("change", refresh);
    return () => {
      p.awareness.off("change", refresh);
      p.leave();
      setAwareness(null);
      setOthers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, doc]);
  return { awareness, others };
}
