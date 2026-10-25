import { guestDeviceId, MemorySyncStorage, REMOTE_ORIGIN, SyncClient } from "@datascratch/shared";
import * as Y from "yjs";
import { sharesApi } from "@/api/endpoints";
import { APP_VERSION, syncUrl } from "@/config";
import { ad, fromBase64Url, sodiumReady, unwrapKey, uuidv7, type GuestGrant } from "@/lib/shared";
import { createSyncStatusStore, uiStatus } from "@/sync/engine";
import { receivePresence } from "./presence";

/**
 * A guest's view of a shared note or notebook (spec/08-sharing.md, D-13, D-37), synced with
 * SyncClient over in-memory storage. The key comes from the URL fragment and never reaches
 * the server.
 */
export class GuestSession {
  readonly status = createSyncStatusStore();
  readonly client: SyncClient;
  readonly docs = new Map<string, Y.Doc>();
  /** Stable id for strokes and presence authored by this guest in this tab. */
  readonly guestId = uuidv7();
  private keys = new Map<string, Uint8Array>();
  private readyDocs = new Set<string>();
  private attached = new Set<string>();
  private listeners = new Set<() => void>();

  private constructor(
    readonly shareId: string,
    readonly grant: GuestGrant,
    rootKey: Uint8Array,
  ) {
    this.keys.set(grant.target.id, rootKey);
    this.client = new SyncClient({
      url: syncUrl(),
      deviceId: guestDeviceId(),
      client: { platform: "web", version: APP_VERSION },
      storage: new MemorySyncStorage(),
      auth: () => ({ kind: "guest", shareId: this.shareId, guestToken: this.grant.guestToken }),
      keyFor: async (docId) => {
        const k = await this.keyFor(docId);
        if (!k) throw new Error(`no key for ${docId}`);
        return k;
      },
    });
    this.client.on("synced", (docId) => {
      this.readyDocs.add(docId);
      this.emit();
      this.updateStatus();
    });
    this.client.on("status", () => this.updateStatus());
    this.client.on("awareness", (docId, payload) => receivePresence(docId, payload));
    this.client.on("error", (e) => {
      console.warn("guest sync:", e.code, e.message, e.docId ?? "");
      // Guest tokens are short-lived: fetch a new one and reconnect.
      if (e.code === "unauthorized")
        void sharesApi.guest(this.shareId).then((g) => {
          this.grant.guestToken = g.guestToken;
          this.client.reconnect();
        });
    });
  }

  static async open(shareId: string, keyText: string): Promise<GuestSession> {
    // SyncClient encrypts synchronously with libsodium: it must be ready first.
    await sodiumReady();
    const key = fromBase64Url(keyText);
    if (key.length !== 32) throw new Error("bad_key");
    const grant = await sharesApi.guest(shareId);
    const s = new GuestSession(shareId, grant, key);
    await s.attach(grant.target.id);
    s.client.start();
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

  private updateStatus() {
    const all = [...this.attached].every((id) => this.client.isSynced(id));
    this.status.setState({ status: uiStatus(this.client.status, all) });
  }

  isReady(docId: string) {
    return this.readyDocs.has(docId);
  }

  doc(docId: string): Y.Doc {
    let d = this.docs.get(docId);
    if (!d) {
      d = new Y.Doc({ guid: docId, gc: false });
      this.docs.set(docId, d);
    }
    return d;
  }

  private async attach(docId: string) {
    if (this.attached.has(docId)) return;
    this.attached.add(docId);
    await this.client.addDoc(docId, this.doc(docId));
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

  /** Subscribe to a note of a shared notebook once its key is known. */
  async subscribeNote(noteId: string) {
    if (!(await this.keyFor(noteId))) return;
    await this.attach(noteId);
  }

  sendAwareness(docId: string, update: Uint8Array) {
    void this.client.sendAwareness(docId, update);
  }

  close() {
    void this.client.stop();
    for (const d of this.docs.values()) d.destroy();
    this.docs.clear();
    this.keys.clear();
  }
}

export { REMOTE_ORIGIN };
