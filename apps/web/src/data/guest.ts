import * as Y from "yjs";
import { sharesApi } from "@/api/endpoints";
import { ad, fromBase64Url, open, seal, toBase64Url, unwrapKey, uuidv7, type GuestGrant } from "@/lib/shared";
import { createSyncStatusStore, SyncEngine, type OutgoingMessage, type SyncHost } from "@/sync/engine";
import { receivePresence } from "./presence";

const ORIGIN_REMOTE = Symbol("guest-remote");

/**
 * A guest's view of a shared note or notebook (spec/08-sharing.md, D-13, D-37).
 * Everything lives in memory: the key comes from the URL fragment and never reaches the server.
 */
export class GuestSession {
  readonly status = createSyncStatusStore();
  readonly engine: SyncEngine;
  readonly docs = new Map<string, Y.Doc>();
  private keys = new Map<string, Uint8Array>();
  private outbox = new Map<string, OutgoingMessage>();
  private lastSeq = new Map<string, number>();
  private readyDocs = new Set<string>();
  private wanted = new Set<string>();
  private listeners = new Set<() => void>();
  private deviceIdValue = uuidv7();

  private constructor(
    readonly shareId: string,
    readonly grant: GuestGrant,
    rootKey: Uint8Array,
  ) {
    this.keys.set(grant.target.id, rootKey);
    this.engine = new SyncEngine(this.host(), this.status);
  }

  static async open(shareId: string, keyText: string): Promise<GuestSession> {
    const key = fromBase64Url(keyText);
    if (key.length !== 32) throw new Error("bad_key");
    const grant = await sharesApi.guest(shareId);
    const s = new GuestSession(shareId, grant, key);
    s.engine.start();
    return s;
  }

  get canEdit() {
    return this.grant.permission === "edit";
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    for (const fn of this.listeners) fn();
  }

  isReady(docId: string) {
    return this.readyDocs.has(docId);
  }

  doc(docId: string): Y.Doc {
    let d = this.docs.get(docId);
    if (!d) {
      d = new Y.Doc({ guid: docId, gc: false });
      d.on("update", (update: Uint8Array, origin: unknown) => {
        if (origin === ORIGIN_REMOTE || !this.canEdit) return;
        void this.queuePush(docId, update);
      });
      this.docs.set(docId, d);
    }
    return d;
  }

  /** Keys for notes inside a shared notebook are wrapped with the notebook key in its index. */
  async keyFor(docId: string): Promise<Uint8Array | null> {
    const k = this.keys.get(docId);
    if (k) return k;
    if (this.grant.target.kind !== "notebook") return null;
    const nb = this.docs.get(this.grant.target.id);
    const wrapped = nb?.getMap<Y.Map<unknown>>("notes").get(docId)?.get("wrappedKey") as string | undefined;
    const nbKey = this.keys.get(this.grant.target.id);
    if (!wrapped || !nbKey) return null;
    try {
      const key = await unwrapKey(nbKey, wrapped, ad.noteKey(docId));
      this.keys.set(docId, key);
      return key;
    } catch {
      return null;
    }
  }

  private async queuePush(docId: string, update: Uint8Array) {
    const key = await this.keyFor(docId);
    if (!key) return;
    const clientMsgId = uuidv7();
    this.outbox.set(clientMsgId, { type: "push", docId, clientMsgId, payload: toBase64Url(await seal(key, update, ad.doc(docId))) });
    this.status.setState({ pending: this.outbox.size });
    void this.engine.flush();
  }

  /** Subscribe to a note of a shared notebook once its key is known. */
  async subscribeNote(noteId: string) {
    if (!(await this.keyFor(noteId))) return;
    this.wanted.add(noteId);
    this.engine.subscribe([{ docId: noteId, since: this.lastSeq.get(noteId) ?? 0 }]);
  }

  close() {
    this.engine.stop();
    for (const d of this.docs.values()) d.destroy();
    this.docs.clear();
    this.keys.clear();
  }

  private async apply(docId: string, items: { seq: number; payload: string }[], snapshot: { seq: number; payload: string } | null) {
    const key = await this.keyFor(docId);
    if (!key) return;
    const doc = this.doc(docId);
    let last = this.lastSeq.get(docId) ?? 0;
    const all = snapshot && snapshot.seq > last ? [snapshot, ...items] : items;
    const decoded: Uint8Array[] = [];
    for (const it of all) {
      if (it.seq <= last && it !== snapshot) continue;
      try {
        decoded.push(await open(key, fromBase64Url(it.payload), ad.doc(docId)));
      } catch {
        // skip undecryptable
      }
      last = Math.max(last, it.seq);
    }
    this.lastSeq.set(docId, last);
    Y.transact(
      doc,
      () => {
        for (const u of decoded) Y.applyUpdate(doc, u, ORIGIN_REMOTE);
      },
      ORIGIN_REMOTE,
    );
  }

  private host(): SyncHost {
    return {
      deviceId: async () => this.deviceIdValue,
      auth: async () => ({ kind: "guest", shareId: this.shareId, guestToken: this.grant.guestToken }),
      refreshAuth: async () => {
        try {
          const g = await sharesApi.guest(this.shareId);
          this.grant.guestToken = g.guestToken;
          return true;
        } catch {
          return false;
        }
      },
      subscriptions: async () => {
        const root = this.grant.target.id;
        const out = [{ docId: root, since: this.lastSeq.get(root) ?? 0 }];
        for (const id of this.wanted) if (id !== root) out.push({ docId: id, since: this.lastSeq.get(id) ?? 0 });
        return out;
      },
      beforeFlush: async () => true,
      outgoing: async () => [...this.outbox.values()],
      onUpdates: async (msg) => {
        await this.apply(msg.docId, msg.items, msg.snapshot);
        if (msg.upToDate && !this.readyDocs.has(msg.docId)) {
          this.readyDocs.add(msg.docId);
          this.emit();
        }
      },
      onUpdate: (msg) => this.apply(msg.docId, [msg], null),
      onAck: async (msg) => {
        this.outbox.delete(msg.clientMsgId);
        this.status.setState({ pending: this.outbox.size });
      },
      onAwareness: (msg) => void receivePresence(msg.docId, msg.payload),
      onError: (msg) => {
        if (msg.code === "forbidden" && msg.ref) this.outbox.delete(msg.ref);
      },
    };
  }
}
