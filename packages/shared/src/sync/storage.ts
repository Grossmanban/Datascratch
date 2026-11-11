// Persistence the sync client needs, behind an interface so each platform
// plugs its own store (IndexedDB/Dexie on the web, SQLite on the server side
// of tests, memory in tests).

/** An encrypted message waiting for the server's `ack`. Never removed before it. */
export interface OutboxItem {
  clientMsgId: string;
  docId: string;
  kind: "push" | "snapshot";
  /** base64url envelope. */
  payload: string;
  /** For snapshots: the snapshot includes all updates with seq ≤ baseSeq. */
  baseSeq?: number;
  /** Plaintext update size (for compaction thresholds). */
  size: number;
  createdAt: number;
}

/** Per-document sync cursor. */
export interface DocSyncState {
  /** Highest seq applied or acknowledged. */
  lastSeq: number;
  /** Updates since the last snapshot (own + remote), for the compaction thresholds. */
  updatesSinceSnapshot: number;
  bytesSinceSnapshot: number;
  /**
   * Protocol 3 (sync-protocol.md §3.1): the `epoch` of the stored account cursor under which this
   * document is known to be caught up. Any other value (or none) — subscribe it from `lastSeq`.
   */
  covered?: string | null;
}

/** The account cursor of protocol 3 and the epoch the documents' `covered` refers to. */
export interface ResumeState {
  cursor: string;
  epoch: string;
}

export interface SyncStorage {
  getDocState(docId: string): Promise<DocSyncState | null>;
  setDocState(docId: string, state: DocSyncState): Promise<void>;
  /** Append to the outbox (order of insertion is the order of sending). */
  enqueue(item: OutboxItem): Promise<void>;
  /** All pending items in insertion order. */
  listOutbox(): Promise<OutboxItem[]>;
  removeOutbox(clientMsgId: string): Promise<void>;
  /** Optional batch read (one transaction); the client falls back to getDocState. */
  getDocStates?(docIds: string[]): Promise<Map<string, DocSyncState>>;
  /** Optional batch write (one transaction); the client falls back to setDocState. */
  setDocStates?(entries: [string, DocSyncState][]): Promise<void>;
  /**
   * Optional (protocol 3): the stored account cursor. A storage without both methods never
   * resumes — the client subscribes every document on each connection, as in version 1.
   */
  getResumeState?(): Promise<ResumeState | null>;
  setResumeState?(state: ResumeState | null): Promise<void>;
}

export const EMPTY_DOC_STATE: DocSyncState = Object.freeze({
  lastSeq: 0,
  updatesSinceSnapshot: 0,
  bytesSinceSnapshot: 0,
});

/** In-memory storage (tests, ephemeral guest sessions). */
export class MemorySyncStorage implements SyncStorage {
  private readonly docs = new Map<string, DocSyncState>();
  private readonly outbox: OutboxItem[] = [];
  private resume: ResumeState | null = null;

  async getResumeState(): Promise<ResumeState | null> {
    return this.resume ? { ...this.resume } : null;
  }
  async setResumeState(state: ResumeState | null): Promise<void> {
    this.resume = state ? { ...state } : null;
  }

  async getDocState(docId: string): Promise<DocSyncState | null> {
    const s = this.docs.get(docId);
    return s ? { ...s } : null;
  }
  async setDocState(docId: string, state: DocSyncState): Promise<void> {
    this.docs.set(docId, { ...state });
  }
  async getDocStates(docIds: string[]): Promise<Map<string, DocSyncState>> {
    const out = new Map<string, DocSyncState>();
    for (const id of docIds) {
      const s = this.docs.get(id);
      if (s) out.set(id, { ...s });
    }
    return out;
  }
  async setDocStates(entries: [string, DocSyncState][]): Promise<void> {
    for (const [id, state] of entries) this.docs.set(id, { ...state });
  }
  async enqueue(item: OutboxItem): Promise<void> {
    this.outbox.push({ ...item });
  }
  async listOutbox(): Promise<OutboxItem[]> {
    return this.outbox.map((i) => ({ ...i }));
  }
  async removeOutbox(clientMsgId: string): Promise<void> {
    const i = this.outbox.findIndex((o) => o.clientMsgId === clientMsgId);
    if (i >= 0) this.outbox.splice(i, 1);
  }
}
