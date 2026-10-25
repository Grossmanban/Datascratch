import type { DocSyncState, OutboxItem, SyncStorage } from "@datascratch/shared";
import type { AccountDB } from "./db";

/**
 * SyncStorage on IndexedDB (Dexie) for SyncClient. Batch reads/writes run in one transaction,
 * which is what makes the first sync of thousands of notes fast.
 */
export class DexieSyncStorage implements SyncStorage {
  constructor(private db: AccountDB) {}

  async getDocState(docId: string): Promise<DocSyncState | null> {
    const r = await this.db.syncDocs.get(docId);
    return r ? { lastSeq: r.lastSeq, updatesSinceSnapshot: r.updatesSinceSnapshot, bytesSinceSnapshot: r.bytesSinceSnapshot } : null;
  }

  async setDocState(docId: string, state: DocSyncState): Promise<void> {
    await this.db.syncDocs.put({ docId, ...state });
  }

  async getDocStates(docIds: string[]): Promise<Map<string, DocSyncState>> {
    const rows = await this.db.syncDocs.bulkGet(docIds);
    const out = new Map<string, DocSyncState>();
    rows.forEach((r, i) => {
      if (r) out.set(docIds[i]!, { lastSeq: r.lastSeq, updatesSinceSnapshot: r.updatesSinceSnapshot, bytesSinceSnapshot: r.bytesSinceSnapshot });
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

  count(): Promise<number> {
    return this.db.syncOutbox.count();
  }
}
