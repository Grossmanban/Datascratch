import { and, eq } from 'drizzle-orm';
import type { DbOrTx } from '../db/client.js';
import { notebooks } from '../db/schema.js';
import { AD, open, seal } from '../lib/sodium.js';

/**
 * Server key wrapping for agent-mode notebooks (crypto.md §8). The server key
 * (DS_KMS_KEY) lives only in the process environment, never in the database,
 * so a database dump alone cannot decrypt anything (R-10).
 */
export class KeyService {
  readonly #serverKey: Uint8Array;

  constructor(serverKey: Uint8Array) {
    if (serverKey.length !== 32) throw new Error('DS_KMS_KEY must be 32 bytes');
    this.#serverKey = serverKey;
  }

  wrapNotebookKey(notebookId: string, notebookKey: Uint8Array): Promise<Uint8Array> {
    return seal(this.#serverKey, notebookKey, AD.notebookServer(notebookId));
  }

  unwrapNotebookKey(notebookId: string, wrapped: Uint8Array): Promise<Uint8Array> {
    return open(this.#serverKey, wrapped, AD.notebookServer(notebookId));
  }

  /**
   * Decrypt the key of an agent-mode notebook. Call only while serving an agent
   * request whose token grants this notebook (and inside its RLS scope).
   * Returns null if the notebook is not in agent mode or not visible.
   */
  async notebookKey(db: DbOrTx, notebookId: string): Promise<Uint8Array | null> {
    const [nb] = await db
      .select({ wrapped: notebooks.serverWrappedKey })
      .from(notebooks)
      .where(and(eq(notebooks.id, notebookId), eq(notebooks.mode, 'agent')));
    if (!nb?.wrapped) return null;
    return this.unwrapNotebookKey(notebookId, nb.wrapped);
  }

  /** Unwrap a note key (NoteMeta.wrappedKey from the notebook document) with the notebook key. */
  noteKey(notebookKey: Uint8Array, noteId: string, wrappedNoteKey: Uint8Array): Promise<Uint8Array> {
    return open(notebookKey, wrappedNoteKey, AD.note(noteId));
  }
}
