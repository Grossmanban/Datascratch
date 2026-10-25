/**
 * Fan-out of live events between connections (D-25). The default implementation
 * keeps everything in process memory; a multi-process deployment would swap it for
 * PostgreSQL LISTEN/NOTIFY or Redis/Valkey without touching the callers.
 *
 * Topics:
 *   doc:<docId>        live updates, awareness, deletion and moves of a document
 *   device:<deviceId>  control: the device was revoked
 *   share:<shareId>    control: the share was revoked
 *   user:<userId>      control: the account was deleted / all sessions revoked
 */
export type HubMessage =
  | { type: 'update'; docId: string; seq: number; payload: string; deviceId: string; origin: string | null }
  | { type: 'awareness'; docId: string; payload: string; deviceId: string; origin: string | null }
  | { type: 'revoked'; reason: string }
  | { type: 'doc_deleted'; docId: string }
  | { type: 'doc_moved'; docId: string };

export type HubListener = (msg: HubMessage) => void;

export interface Broadcaster {
  publish(topic: string, msg: HubMessage): void;
  /** Returns an unsubscribe function. */
  subscribe(topic: string, listener: HubListener): () => void;
}

export const topics = {
  doc: (id: string) => `doc:${id}`,
  device: (id: string) => `device:${id}`,
  share: (id: string) => `share:${id}`,
  user: (id: string) => `user:${id}`,
} as const;

export class MemoryBroadcaster implements Broadcaster {
  readonly #listeners = new Map<string, Set<HubListener>>();

  publish(topic: string, msg: HubMessage): void {
    const set = this.#listeners.get(topic);
    if (!set) return;
    for (const l of [...set]) {
      try {
        l(msg);
      } catch {
        // A failing listener must not break delivery to the others.
      }
    }
  }

  subscribe(topic: string, listener: HubListener): () => void {
    let set = this.#listeners.get(topic);
    if (!set) {
      set = new Set();
      this.#listeners.set(topic, set);
    }
    set.add(listener);
    return () => {
      const s = this.#listeners.get(topic);
      if (!s) return;
      s.delete(listener);
      if (s.size === 0) this.#listeners.delete(topic);
    };
  }

  /** Number of topics with listeners (for tests and metrics). */
  get topicCount(): number {
    return this.#listeners.size;
  }
}
