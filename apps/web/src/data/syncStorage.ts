import type { DocSyncState, OutboxItem, ResumeState, SyncStorage } from "@datascratch/shared";
import type { AccountDB, SyncDocRow } from "./db";

/** kv key of the account cursor of sync protocol 3 (sync-protocol.md §3.1). */
const RESUME_KEY = "sync.resume";

const toState = (r: SyncDocRow): DocSyncState => ({
  lastSeq: r.lastSeq,
  updatesSinceSnapshot: r.updatesSinceSnapshot,
  bytesSinceSnapshot: r.bytesSinceSnapshot,
  ...(r.covered !== undefined ? { covered: r.covered } : {}),
});

/**
 * SyncStorage on IndexedDB (Dexie) for SyncClient. Batch reads/writes run in one transaction,
 * which is what makes the first sync of thousands of notes fast.
 */
export class DexieSyncStorage implements SyncStorage {
  constructor(private db: AccountDB) {}

  async getDocState(docId: string): Promise<DocSyncState | null> {
    const r = await this.db.syncDocs.get(docId);
    return r ? toState(r) : null;
  }

  async setDocState(docId: string, state: DocSyncState): Promise<void> {
    await this.db.syncDocs.put({ docId, ...state });
  }

  async getDocStates(docIds: string[]): Promise<Map<string, DocSyncState>> {
    const rows = await this.db.syncDocs.bulkGet(docIds);
    const out = new Map<string, DocSyncState>();
    rows.forEach((r, i) => {
      if (r) out.set(docIds[i]!, toState(r));
    });
    return out;
  }

  async setDocStates(entries: [string, DocSyncState][]): Promise<void> {
    await this.db.syncDocs.bulkPut(entries.map(([docId, s]) => ({ docId, ...s })));
  }

  async enqueue(item: OutboxItem): Promise<void> {
    await this.db.syncOutbox.add({ ...item });
  }

  async listOutbox(): Promise<OutboxItem[]> {
    const rows = await this.db.syncOutbox.orderBy("seq").toArray();
    return rows.map(({ seq: _seq, ...item }) => item as OutboxItem);
  }

  async removeOutbox(clientMsgId: string): Promise<void> {
    await this.db.syncOutbox.where("clientMsgId").equals(clientMsgId).delete();
  }

  /** Protocol 3: the stored account cursor (resume instead of subscribing every note). */
  async getResumeState(): Promise<ResumeState | null> {
    const row = await this.db.kv.get(RESUME_KEY);
    const v = row?.value as Partial<ResumeState> | undefined;
    return v && typeof v.cursor === "string" && typeof v.epoch === "string" ? { cursor: v.cursor, epoch: v.epoch } : null;
  }

  async setResumeState(state: ResumeState | null): Promise<void> {
    if (state) await this.db.kv.put({ key: RESUME_KEY, value: { ...state } });
    else await this.db.kv.delete(RESUME_KEY);
  }

  count(): Promise<number> {
    return this.db.syncOutbox.count();
  }
}
