// Load generator for memory-check.sh (no dependencies; Node 22).
//   node memory-load.mjs ids   <n>                         → n UUIDv7 ids, one per line
//   node memory-load.mjs setup <base>                      → prints {userId, notebookId, accessToken, deviceId}
//   node memory-load.mjs sync  <base> <account.json> <ids> → subscribes to every id (1000 per message), waits for all upToDate
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [mode, base] = process.argv.slice(2);
const b64 = (n) => randomBytes(n).toString('base64url');
// Client ids are UUIDv7 (document-model.md §1).
const uuidv7 = () => {
  const b = randomBytes(16);
  const ms = BigInt(Date.now());
  for (let i = 0; i < 6; i++) b[i] = Number((ms >> BigInt(8 * (5 - i))) & 0xffn);
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

async function post(path, body, token) {
  const r = await fetch(`${base}/v1${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

if (mode === 'ids') {
  const n = Number(process.argv[3]);
  process.stdout.write(Array.from({ length: n }, uuidv7).join('\n') + '\n');
} else if (mode === 'setup') {
  const userId = uuidv7();
  const s = await post('/auth/signup', {
    email: `mem-${b64(4)}@example.com`,
    salt: b64(16),
    kdf: { alg: 'argon2id13', ops: 3, mem: 67108864 },
    loginKey: b64(32),
    recoveryLoginKey: b64(32),
    wrappedMasterKeyPassword: b64(73),
    wrappedMasterKeyRecovery: b64(73),
    userId,
    accountDocId: uuidv7(),
    deviceName: 'memory-check',
  });
  const notebookId = uuidv7();
  await post('/notebooks', { notebookId, mode: 'private', wrappedKey: b64(73) }, s.accessToken);
  console.log(JSON.stringify({ userId, notebookId, accessToken: s.accessToken, deviceId: s.deviceId }));
} else if (mode === 'sync') {
  const acc = JSON.parse(readFileSync(process.argv[4], 'utf8'));
  const ids = readFileSync(process.argv[5], 'utf8').split('\n').filter(Boolean);
  const ws = new WebSocket(base.replace(/^http/, 'ws') + '/v1/sync');
  const pending = new Set(ids);
  const start = Date.now();
  await new Promise((resolve, reject) => {
    ws.onerror = () => reject(new Error('websocket error'));
    ws.onopen = () =>
      ws.send(
        JSON.stringify({
          type: 'hello',
          protocol: 1,
          auth: { kind: 'user', accessToken: acc.accessToken },
          deviceId: acc.deviceId,
          client: { platform: 'web', version: 'memcheck' },
        }),
      );
    ws.onmessage = (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.type === 'welcome') {
        // At most 1000 documents per subscribe (MAX_SUBSCRIBE_DOCS, sync-protocol).
        for (let i = 0; i < ids.length; i += 1000) {
          ws.send(JSON.stringify({ type: 'subscribe', docs: ids.slice(i, i + 1000).map((docId) => ({ docId, since: 0 })) }));
        }
      }
      else if (m.type === 'updates' && m.upToDate) {
        pending.delete(m.docId);
        if (pending.size === 0) resolve();
      } else if (m.type === 'error') reject(new Error(JSON.stringify(m)));
    };
  });
  console.log(`first sync of ${ids.length} notes: ${Date.now() - start} ms`);
  ws.close();
} else {
  console.error('usage: memory-load.mjs setup|sync ...');
  process.exit(2);
}
