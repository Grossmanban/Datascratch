// Post-deploy check over the public address: web app, API health, sync WebSocket,
// that image download by link refuses private addresses, and that /metrics is not exposed. Usage: node smoke.mjs https://example.com [timeoutSec]
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

const b64 = (n) => Buffer.from(crypto.getRandomValues(new Uint8Array(n))).toString('base64url');
function uuidv7() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  const t = BigInt(Date.now());
  for (let i = 0; i < 6; i++) b[i] = Number((t >> BigInt(8 * (5 - i))) & 0xffn);
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Buffer.from(b).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const post = (path, body, token) =>
  fetch(`${base}/v1${path}`, {
    method: path === '/me' ? 'DELETE' : 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

// Image download by link (D-52) must refuse private addresses. Uses a throwaway account, deleted afterwards.
async function fetchImageBlocksPrivate() {
  const loginKey = b64(32);
  const signup = await post('/auth/signup', {
    email: `smoke-${uuidv7().slice(-12)}@example.com`,
    salt: b64(16),
    kdf: { alg: 'argon2id13', ops: 3, mem: 67108864 },
    loginKey,
    recoveryLoginKey: b64(32),
    wrappedMasterKeyPassword: b64(73),
    wrappedMasterKeyRecovery: b64(73),
    userId: uuidv7(),
    accountDocId: uuidv7(),
    deviceName: 'smoke test',
  });
  if (!signup.ok) throw new Error(`signup: status ${signup.status}`);
  const { accessToken } = await signup.json();
  try {
    for (const url of ['http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data/', 'http://[::1]/', 'http://server:8080/v1/health']) {
      const r = await post('/fetch-image', { url }, accessToken);
      const j = await r.json().catch(() => null);
      if (r.status !== 422 || j?.error !== 'blocked') throw new Error(`a private address was not blocked: status ${r.status}`);
    }
  } finally {
    await post('/me', { loginKey }, accessToken).catch(() => {});
  }
  return 'private addresses blocked';
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
  await retry('agent consent page keeps its own CSP', async () => {
    // The web app's CSP (form-action 'self') on top of the server's blocks the redirect back to the agent.
    const r = await fetch(`${base}/oauth/authorize`);
    const csp = r.headers.get('content-security-policy') ?? '';
    if (!csp.startsWith("default-src 'none'") || csp.includes("default-src 'self'")) throw new Error(`CSP: ${csp}`);
  });
  await retry('sync WebSocket', wsCheck);
  await retry('image by link', fetchImageBlocksPrivate);
  await retry('metrics hidden', async () => {
    const r = await fetch(`${base}/metrics`);
    if (r.status !== 404) throw new Error(`status ${r.status}`);
  });
  console.log(`smoke test passed: ${base}`);
} catch (e) {
  console.error(String(e.message ?? e));
  process.exit(1);
}
