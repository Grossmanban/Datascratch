/**
 * READ-ONLY diagnostics of an agent-mode document: which stored items (the
 * latest snapshot and every update after it) the server can decrypt with its
 * key and apply as Yjs v1 updates. Prints one line per item and a summary —
 * never plaintext, never keys (only a short fingerprint of the key in use).
 *
 *   node dist/diag-agent-doc-cli.js <docId> [<docId>…]
 *   (in the container: docker compose exec server node dist/diag-agent-doc-cli.js <docId>)
 */
import { createHash } from 'node:crypto';
import { and, asc, desc, eq, gt } from 'drizzle-orm';
import * as Y from 'yjs';
import { loadConfig } from './config.js';
import { createDatabase } from './db/client.js';
import { docSnapshots, docUpdates, docs, notebooks } from './db/schema.js';
import { fromB64 } from './lib/encoding.js';
import { AD, open } from './lib/sodium.js';
import { KeyService } from './services/keys.js';

const fingerprint = (key: Uint8Array) => createHash('sha256').update(key).digest('hex').slice(0, 8);

const config = loadConfig();
const database = createDatabase(config.DATABASE_URL, 1);
const keys = new KeyService(fromB64(config.DS_KMS_KEY));
const db = database.db;

interface Item {
  kind: 'snapshot' | 'update';
  seq: number;
  deviceId: string;
  createdAt: Date;
  payload: Uint8Array;
}

async function items(docId: string): Promise<Item[]> {
  const [snap] = await db
    .select()
    .from(docSnapshots)
    .where(eq(docSnapshots.docId, docId))
    .orderBy(desc(docSnapshots.seq))
    .limit(1);
  const from = snap?.seq ?? 0;
  const rows = await db
    .select()
    .from(docUpdates)
    .where(and(eq(docUpdates.docId, docId), gt(docUpdates.seq, from)))
    .orderBy(asc(docUpdates.seq));
  return [
    ...(snap ? [{ kind: 'snapshot' as const, ...snap }] : []),
    ...rows.map((r) => ({ kind: 'update' as const, ...r })),
  ];
}

/** Decrypts and applies items one by one; returns the doc built from the readable ones. */
async function check(docId: string, key: Uint8Array, print: boolean) {
  const doc = new Y.Doc({ gc: false });
  const bad: number[] = [];
  for (const it of await items(docId)) {
    let decrypt = 'ok';
    let apply = '-';
    try {
      const plain = await open(key, it.payload, AD.doc(docId));
      try {
        Y.applyUpdate(doc, plain);
        apply = 'ok';
      } catch (err) {
        apply = `FAIL (${(err as Error).message})`;
        bad.push(it.seq);
      }
    } catch {
      decrypt = 'FAIL';
      bad.push(it.seq);
    }
    if (print)
      console.log(
        [
          it.kind.padEnd(8),
          `seq=${it.seq}`,
          `device=${it.deviceId}`,
          `at=${it.createdAt.toISOString()}`,
          `bytes=${it.payload.byteLength}`,
          `envelope=v${it.payload[0] ?? '?'}`,
          `decrypt=${decrypt}`,
          `apply=${apply}`,
        ].join('  '),
      );
  }
  return { doc, bad };
}

async function main(docId: string) {
  const [d] = await db.select().from(docs).where(eq(docs.id, docId));
  if (!d) return console.log(`${docId}: no such document`);
  console.log(`\n## ${docId} kind=${d.kind} notebook=${d.notebookId} lastSeq=${d.lastSeq}`);
  if (!d.notebookId || d.kind === 'account') return console.log('not a notebook/note document');
  const [nb] = await db.select().from(notebooks).where(eq(notebooks.id, d.notebookId));
  if (!nb || nb.mode !== 'agent' || !nb.serverWrappedKey)
    return console.log(`notebook ${d.notebookId} is not in agent mode (no server key)`);
  const nbKey = await keys.unwrapNotebookKey(d.notebookId, nb.serverWrappedKey);
  console.log(`notebook key fingerprint (sha256/8): ${fingerprint(nbKey)}`);
  let key = nbKey;
  if (d.kind === 'note') {
    const { doc: index, bad } = await check(d.notebookId, nbKey, false);
    const meta = index.getMap('notes').get(docId);
    const wrapped = meta instanceof Y.Map ? meta.get('wrappedKey') : undefined;
    if (typeof wrapped !== 'string')
      return console.log(`no NoteMeta.wrappedKey in the notebook index (unreadable index seqs: ${bad.join(',') || 'none'})`);
    key = await keys.noteKey(nbKey, docId, fromB64(wrapped));
    console.log(`note key fingerprint: ${fingerprint(key)}`);
  }
  const { bad } = await check(docId, key, true);
  console.log(bad.length ? `UNREADABLE items: seq ${bad.join(', ')}` : 'all items readable');
}

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('usage: node dist/diag-agent-doc-cli.js <docId> [<docId>…]');
  process.exitCode = 2;
}
try {
  for (const id of ids) await main(id);
} finally {
  await database.close();
}
