import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ImageFetcher, isPublicAddress, sniffImage } from '../src/services/image-fetch.js';
import { api, signup, startServer, type TestServer, type TestUser } from './helpers.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 7)]);

let s: TestServer;
let u: TestUser;
let img: Server;
let port: number;
const seen: Record<string, string | undefined>[] = [];

beforeAll(async () => {
  s = await startServer();
  u = await signup(s);
  img = createServer((req, res) => {
    const path = req.url ?? '/';
    seen.push({ path, cookie: req.headers.cookie, referer: req.headers.referer, ua: req.headers['user-agent'] });
    const send = (status: number, type: string, body: Buffer | string, headers: Record<string, string> = {}) => {
      res.writeHead(status, { 'content-type': type, ...headers });
      res.end(body);
    };
    if (path === '/png') return send(200, 'image/png', PNG);
    if (path === '/fake') return send(200, 'image/png', 'definitely not a png');
    if (path === '/html') return send(200, 'text/html', PNG);
    if (path === '/svg') return send(200, 'image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg"/>');
    if (path === '/svg-as-png') return send(200, 'image/png', '<svg xmlns="http://www.w3.org/2000/svg"/>');
    if (path === '/404') return send(404, 'image/png', PNG);
    if (path === '/redirect-ok') return send(302, 'text/plain', '', { location: '/png' });
    if (path === '/redirect-private') return send(302, 'text/plain', '', { location: 'http://10.0.0.1/x.png' });
    if (path === '/redirect-dns') return send(302, 'text/plain', '', { location: `http://internal.test:${port}/png` });
    if (path === '/loop') return send(302, 'text/plain', '', { location: '/loop' });
    if (path === '/big') {
      // No Content-Length (chunked): the cap must hold while streaming.
      res.writeHead(200, { 'content-type': 'image/png' });
      res.write(PNG);
      const chunk = Buffer.alloc(64 * 1024);
      let left = 64;
      const pump = () => {
        while (left > 0 && res.write(chunk)) left--;
        if (left > 0) res.once('drain', pump);
        else res.end();
      };
      res.on('error', () => {});
      return pump();
    }
    if (path === '/huge-declared') return send(200, 'image/png', PNG, { 'content-length': String(50 * 1024 * 1024) });
    if (path === '/slow') return; // never answers
    send(404, 'text/plain', 'no');
  });
  await new Promise<void>((r) => img.listen(0, '127.0.0.1', r));
  port = (img.address() as AddressInfo).port;
});
afterAll(async () => {
  img.closeAllConnections();
  await new Promise((r) => img.close(r));
  await s.close();
});

const fetchImage = (url: string, token: string | null = u.session.accessToken) =>
  api(s, 'POST', '/fetch-image', { body: { url }, ...(token ? { token } : {}) });

/** A fetcher that may reach only the local test server (127.0.0.1:port) and resolves *.test names itself. */
function localFetcher(dns: Record<string, string[]> = {}, opts: { maxBytes?: number; timeoutMs?: number } = {}) {
  const calls: string[] = [];
  const fetcher = new ImageFetcher({
    maxBytes: opts.maxBytes ?? 1024 * 1024,
    timeoutMs: opts.timeoutMs ?? 2000,
    allowedPorts: [port],
    isAllowedAddress: (ip) => ip === '127.0.0.1',
    resolve: async (host) => {
      calls.push(host);
      const list = dns[host];
      if (!list) throw new Error('ENOTFOUND');
      return list.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
    },
  });
  return { fetcher, calls };
}

describe('address policy', () => {
  it('refuses private, local, special and embedded-IPv4 IPv6 forms', () => {
    for (const ip of [
      '0.0.0.0',
      '10.1.2.3',
      '100.64.0.1',
      '127.0.0.1',
      '127.255.255.254',
      '169.254.169.254',
      '172.16.0.1',
      '172.31.255.255',
      '192.0.0.8',
      '192.0.2.1',
      '192.168.1.1',
      '198.18.0.1',
      '224.0.0.1',
      '240.0.0.1',
      '255.255.255.255',
      '::',
      '::1',
      'fc00::1',
      'fd12:3456::1',
      'fe80::1',
      'ff02::1',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
      '::ffff:10.0.0.1',
      '::127.0.0.1',
      '64:ff9b::7f00:1',
      '64:ff9b:1::a00:1',
      '2002:7f00:1::1',
      '2001::1',
      '2001:db8::1',
      'not an ip',
    ]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  it('allows public unicast', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '100.128.0.1', '2606:4700::1111', '2a00:1450:4001::200e']) {
      expect(isPublicAddress(ip), ip).toBe(true);
    }
  });

  it('recognises image signatures and never SVG', () => {
    expect(sniffImage(PNG)).toBe('image/png');
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg');
    expect(sniffImage(Buffer.from('GIF89a......'))).toBe('image/gif');
    expect(sniffImage(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
    expect(sniffImage(Buffer.from('\0\0\0\x1cftypheic\0\0\0\0'))).toBe('image/heic');
    expect(sniffImage(Buffer.from('\0\0\0\x1cftypavif\0\0\0\0'))).toBe('image/avif');
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImage(Buffer.from('<?xml version="1.0"?><svg/>'))).toBeNull();
  });
});

describe('POST /v1/fetch-image', () => {
  it('requires a signed-in user', async () => {
    expect((await fetchImage('https://example.com/a.png', null)).status).toBe(401);
    expect((await fetchImage('https://example.com/a.png', 'bogus')).status).toBe(401);
  });

  it('blocks private and local targets before connecting (real policy)', async () => {
    for (const url of [
      'http://127.0.0.1/a.png',
      'http://10.0.0.1/a.png',
      'http://192.168.0.10/a.png',
      'http://169.254.169.254/latest/meta-data/',
      'http://100.64.1.1/',
      'http://0.0.0.0/',
      'http://[::1]/a.png',
      'http://[fc00::1]/a.png',
      'http://[fe80::1]/a.png',
      'http://[::ffff:127.0.0.1]/a.png',
      'http://[64:ff9b::7f00:1]/',
      'http://2130706433/a.png', // decimal 127.0.0.1
      'http://0177.0.0.1/a.png', // octal
      'http://0x7f.1/a.png', // hex, short form
      'http://127.1/a.png',
      'http://localhost/a.png', // via DNS
      'https://example.com:8080/a.png', // port
      'https://user:pass@example.com/a.png', // credentials
      'ftp://example.com/a.png',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'not a url',
    ]) {
      const r = await fetchImage(url);
      expect([r.status, r.body], url).toEqual([422, { error: 'blocked' }]);
    }
  });

  it('downloads an image and sends no cookies, auth or Referer', async () => {
    const { fetcher } = localFetcher({ 'img.test': ['127.0.0.1'] });
    s.ctx.imageFetcher = fetcher;
    seen.length = 0;
    const res = await fetch(`${s.url}/v1/fetch-image`, {
      method: 'POST',
      headers: { authorization: `Bearer ${u.session.accessToken}`, 'content-type': 'application/json', cookie: 'a=b' },
      body: JSON.stringify({ url: `http://img.test:${port}/png` }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('content-length')).toBe(String(PNG.length));
    expect(Buffer.from(await res.arrayBuffer()).equals(PNG)).toBe(true);
    expect(seen).toEqual([{ path: '/png', cookie: undefined, referer: undefined, ua: 'Datascratch-ImageFetch/1.0' }]);
  });

  it('follows up to 3 redirects, re-validating each target', async () => {
    const { fetcher } = localFetcher({ 'img.test': ['127.0.0.1'], 'internal.test': ['127.0.0.2'] });
    s.ctx.imageFetcher = fetcher;
    const base = `http://img.test:${port}`;
    expect((await fetchImage(`${base}/redirect-ok`)).status).toBe(200);
    expect((await fetchImage(`${base}/redirect-private`)).body).toEqual({ error: 'blocked' });
    expect((await fetchImage(`${base}/redirect-dns`)).body).toEqual({ error: 'blocked' });
    expect((await fetchImage(`${base}/loop`)).body).toEqual({ error: 'unreachable' });
  });

  it('pins the vetted address (no second DNS answer) and refuses a mixed answer', async () => {
    let n = 0;
    const calls: string[] = [];
    s.ctx.imageFetcher = new ImageFetcher({
      maxBytes: 1024 * 1024,
      timeoutMs: 2000,
      allowedPorts: [port],
      isAllowedAddress: (ip) => ip === '127.0.0.1',
      // A rebinding resolver: public-looking first, private afterwards.
      resolve: async (host) => {
        calls.push(host);
        return [{ address: n++ === 0 ? '127.0.0.1' : '10.0.0.1', family: 4 }];
      },
    });
    expect((await fetchImage(`http://rebind.test:${port}/png`)).status).toBe(200);
    expect(calls).toEqual(['rebind.test']);

    s.ctx.imageFetcher = localFetcher({ 'mixed.test': ['127.0.0.1', '10.0.0.1'] }).fetcher;
    expect((await fetchImage(`http://mixed.test:${port}/png`)).body).toEqual({ error: 'blocked' });
  });

  it('accepts only real images, never SVG', async () => {
    s.ctx.imageFetcher = localFetcher({ 'img.test': ['127.0.0.1'] }).fetcher;
    const base = `http://img.test:${port}`;
    for (const path of ['/fake', '/html', '/svg', '/svg-as-png']) {
      expect((await fetchImage(`${base}${path}`)).body, path).toEqual({ error: 'not_image' });
    }
    expect((await fetchImage(`${base}/404`)).body).toEqual({ error: 'unreachable' });
    expect((await fetchImage(`http://nowhere.test:${port}/png`)).body).toEqual({ error: 'unreachable' });
  });

  it('caps the size while streaming and times out', async () => {
    s.ctx.imageFetcher = localFetcher({ 'img.test': ['127.0.0.1'] }, { maxBytes: 1024 * 1024, timeoutMs: 800 }).fetcher;
    const base = `http://img.test:${port}`;
    expect((await fetchImage(`${base}/big`)).body).toEqual({ error: 'too_large' });
    expect((await fetchImage(`${base}/huge-declared`)).body).toEqual({ error: 'too_large' });
    const t = Date.now();
    expect((await fetchImage(`${base}/slow`)).body).toEqual({ error: 'timeout' });
    expect(Date.now() - t).toBeLessThan(5000);
    // The server is still fine afterwards.
    expect((await fetchImage(`${base}/png`)).status).toBe(200);
  });

  it('counts results without recording the URL', async () => {
    const metrics = s.ctx.metrics.render();
    expect(metrics).toMatch(/ds_fetch_image_total\{result="blocked"\} \d+/);
    expect(metrics).toMatch(/ds_fetch_image_total\{result="ok"\} \d+/);
    expect(metrics).not.toContain('img.test');
  });
});

describe('fetch-image rate limit', () => {
  it('limits requests per account', async () => {
    const t = await startServer({ FETCH_IMAGE_PER_MINUTE: '3' });
    try {
      const a = await signup(t);
      const b = await signup(t);
      const call = (x: TestUser) =>
        api(t, 'POST', '/fetch-image', { body: { url: 'http://127.0.0.1/' }, token: x.session.accessToken });
      for (let i = 0; i < 3; i++) expect((await call(a)).status).toBe(422);
      const limited = await call(a);
      expect(limited.status).toBe(429);
      expect(limited.body.error.code).toBe('rate_limited');
      // Another account is not affected.
      expect((await call(b)).status).toBe(422);
    } finally {
      await t.close();
    }
  });
});
