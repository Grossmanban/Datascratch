// Post-deploy check over the public address: web app, API health, sync WebSocket,
// and that /metrics is not exposed. Usage: node smoke.mjs https://example.com [timeoutSec]
const base = (process.argv[2] ?? '').replace(/\/+$/, '');
const deadline = Date.now() + Number(process.argv[3] ?? 300) * 1000;
if (!/^https?:\/\//.test(base)) {
  console.error('usage: node smoke.mjs https://<domain> [timeoutSec]');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(name, fn) {
  let last;
  while (Date.now() < deadline) {
    try {
      const r = await fn();
      console.log(`ok  ${name}${r ? `: ${r}` : ''}`);
      return;
    } catch (e) {
      last = e;
      await sleep(5000);
    }
  }
  throw new Error(`${name} failed: ${last?.message ?? last}`);
}

function wsCheck() {
  return new Promise((resolve, reject) => {
    const url = base.replace(/^http/, 'ws') + '/v1/sync';
    const ws = new WebSocket(url);
    const t = setTimeout(() => {
      ws.close();
      reject(new Error('no answer from sync'));
    }, 10_000);
    ws.onopen = () =>
      ws.send(
        JSON.stringify({
          type: 'hello',
          protocol: 1,
          auth: { kind: 'user', accessToken: 'smoke-test' },
          deviceId: 'smoke',
          client: { platform: 'web', version: 'smoke' },
        }),
      );
    ws.onmessage = (ev) => {
      clearTimeout(t);
      const m = JSON.parse(String(ev.data));
      ws.close();
      // A bogus token must be refused by the protocol: the WebSocket path works end to end.
      m.type === 'error' && m.code === 'unauthorized' ? resolve('protocol answers') : reject(new Error(String(ev.data)));
    };
    ws.onerror = () => {
      clearTimeout(t);
      reject(new Error('websocket error'));
    };
  });
}

try {
  await retry('API health', async () => {
    const r = await fetch(`${base}/v1/health`);
    const j = await r.json();
    if (!r.ok || j.ok !== true) throw new Error(`status ${r.status}`);
    return `version ${j.version}`;
  });
  await retry('web app', async () => {
    const r = await fetch(`${base}/`);
    const t = await r.text();
    if (!r.ok || !t.includes('<div id="root"')) throw new Error(`status ${r.status}`);
  });
  await retry('sync WebSocket', wsCheck);
  await retry('metrics hidden', async () => {
    const r = await fetch(`${base}/metrics`);
    if (r.status !== 404) throw new Error(`status ${r.status}`);
  });
  console.log(`smoke test passed: ${base}`);
} catch (e) {
  console.error(String(e.message ?? e));
  process.exit(1);
}
