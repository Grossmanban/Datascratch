import { lookup as dnsLookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';

/**
 * Server-side download of a pasted image link for the web app (D-52, api.md
 * "Картинка по ссылке"). The endpoint is an SSRF target by design, so:
 * - only http/https on ports 80/443, no credentials in the URL;
 * - the host is resolved first and every address must be public (IPv4 and IPv6,
 *   mapped/compat/NAT64/6to4 forms included); the connection goes to the vetted
 *   address (pinned through `lookup`), so DNS cannot change it in between;
 * - at most 3 redirects, each validated the same way;
 * - no cookies, auth or Referer; a neutral User-Agent;
 * - a hard byte cap while streaming and one total timeout;
 * - `Content-Type: image/*` plus a magic-byte check; SVG is refused.
 * Error messages never contain the URL: callers may log them.
 */

export type FetchImageError = 'blocked' | 'not_image' | 'too_large' | 'timeout' | 'unreachable';

export class FetchImageFailure extends Error {
  constructor(readonly code: FetchImageError) {
    super(code);
  }
}

export interface FetchedImage {
  mime: string;
  bytes: Buffer;
}

export interface ImageFetcherOptions {
  maxBytes: number;
  timeoutMs: number;
  maxRedirects?: number;
  /** Tests only: resolver and address policy overrides. */
  resolve?: (host: string) => Promise<{ address: string; family: number }[]>;
  isAllowedAddress?: (ip: string) => boolean;
  allowedPorts?: number[];
}

const USER_AGENT = 'Datascratch-ImageFetch/1.0';

const v4 = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], // "this" network, unspecified
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12],
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16],
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, broadcast
] as const) {
  v4.addSubnet(net, prefix, 'ipv4');
}

// IPv6: only global unicast (2000::/3) is allowed, minus special-purpose blocks.
// Everything else (::, ::1, ::ffff:a.b.c.d, ::a.b.c.d, 64:ff9b::/96 NAT64,
// fc00::/7, fe80::/10, ff00::/8, ...) lies outside 2000::/3 and is refused.
const v6Global = new BlockList();
v6Global.addSubnet('2000::', 3, 'ipv6');
const v6Special = new BlockList();
for (const [net, prefix] of [
  ['2001::', 23], // IETF protocol assignments (Teredo 2001::/32, ORCHID, ...)
  ['2001:db8::', 32], // documentation
  ['2002::', 16], // 6to4: embeds an IPv4 address
  ['3fff::', 20], // documentation
] as const) {
  v6Special.addSubnet(net, prefix, 'ipv6');
}

/** True if `ip` is a public unicast address that may be fetched from. */
export function isPublicAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return !v4.check(ip, 'ipv4');
  if (family === 6) return v6Global.check(ip, 'ipv6') && !v6Special.check(ip, 'ipv6');
  return false;
}

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

/** Image type by signature (null: not an accepted image). SVG is never accepted. */
export function sniffImage(b: Buffer): string | null {
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 6 && /^GIF8[79]a$/.test(b.toString('latin1', 0, 6))) return 'image/gif';
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  if (b.length >= 12 && b.toString('latin1', 4, 8) === 'ftyp') {
    const brand = b.toString('latin1', 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
  }
  return null;
}

/** `p`, or a timeout failure as soon as `signal` aborts (DNS lookups cannot be cancelled). */
function untilAborted<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new FetchImageFailure('timeout'));
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    p.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/** Enough bytes to tell every accepted signature apart. */
const SNIFF_BYTES = 12;

export class ImageFetcher {
  readonly #o: Required<Omit<ImageFetcherOptions, 'resolve' | 'isAllowedAddress' | 'allowedPorts'>> & {
    resolve: NonNullable<ImageFetcherOptions['resolve']>;
    isAllowed: (ip: string) => boolean;
    ports: number[];
  };

  constructor(opts: ImageFetcherOptions) {
    this.#o = {
      maxBytes: opts.maxBytes,
      timeoutMs: opts.timeoutMs,
      maxRedirects: opts.maxRedirects ?? 3,
      resolve: opts.resolve ?? ((host) => dnsLookup(host, { all: true, verbatim: true })),
      isAllowed: opts.isAllowedAddress ?? isPublicAddress,
      ports: opts.allowedPorts ?? [80, 443],
    };
  }

  async fetch(rawUrl: string): Promise<FetchedImage> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.#o.timeoutMs);
    try {
      let url = rawUrl;
      for (let hop = 0; ; hop++) {
        const target = await untilAborted(this.#vet(url), ac.signal);
        const res = await this.#get(target, ac.signal);
        if (res.kind === 'image') return res.image;
        if (hop >= this.#o.maxRedirects) throw new FetchImageFailure('unreachable');
        url = res.location;
      }
    } catch (e) {
      if (e instanceof FetchImageFailure) throw e;
      throw new FetchImageFailure(ac.signal.aborted ? 'timeout' : 'unreachable');
    } finally {
      clearTimeout(timer);
    }
  }

  /** Parse the URL and pick a vetted address to connect to. */
  async #vet(raw: string): Promise<{ url: URL; host: string; address: string; family: number; port: number }> {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new FetchImageFailure('blocked');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new FetchImageFailure('blocked');
    if (url.username || url.password) throw new FetchImageFailure('blocked');
    const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    if (!this.#o.ports.includes(port)) throw new FetchImageFailure('blocked');
    // WHATWG URL already normalised decimal/octal/hex IPv4 forms ("2130706433", "0177.0.0.1").
    const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
    if (!host) throw new FetchImageFailure('blocked');
    if (isIP(host)) {
      if (!this.#o.isAllowed(host)) throw new FetchImageFailure('blocked');
      return { url, host, address: host, family: isIP(host), port };
    }
    let found: { address: string; family: number }[];
    try {
      found = await this.#o.resolve(host);
    } catch {
      throw new FetchImageFailure('unreachable');
    }
    if (found.length === 0) throw new FetchImageFailure('unreachable');
    // Any non-public address disqualifies the name: no picking around a mixed answer.
    if (found.some((a) => !this.#o.isAllowed(a.address))) throw new FetchImageFailure('blocked');
    const first = found[0]!;
    return { url, host, address: first.address, family: first.family, port };
  }

  #get(
    t: { url: URL; host: string; address: string; family: number; port: number },
    signal: AbortSignal,
  ): Promise<{ kind: 'image'; image: FetchedImage } | { kind: 'redirect'; location: string }> {
    const { maxBytes } = this.#o;
    // The socket connects to the vetted address only; the name is kept for Host and TLS (SNI, certificate).
    const pinned: LookupFunction = (_name, opts, cb) => {
      if (opts.all) (cb as (e: null, a: { address: string; family: number }[]) => void)(null, [{ address: t.address, family: t.family }]);
      else cb(null, t.address, t.family);
    };
    const mod = t.url.protocol === 'https:' ? https : http;
    return new Promise((resolve, reject) => {
      const req = mod.request(
        {
          host: t.host,
          port: t.port,
          path: `${t.url.pathname}${t.url.search}`,
          method: 'GET',
          lookup: pinned,
          ...(isIP(t.host) ? {} : { servername: t.host }),
          agent: false,
          signal,
          headers: { 'user-agent': USER_AGENT, accept: 'image/*', 'accept-encoding': 'identity' },
        },
        (res) => {
          const status = res.statusCode ?? 0;
          if (REDIRECTS.has(status)) {
            const loc = res.headers.location;
            res.resume();
            if (!loc) return reject(new FetchImageFailure('unreachable'));
            try {
              return resolve({ kind: 'redirect', location: new URL(loc, t.url).toString() });
            } catch {
              return reject(new FetchImageFailure('blocked'));
            }
          }
          const fail = (code: FetchImageError) => {
            res.destroy();
            reject(new FetchImageFailure(code));
          };
          if (status < 200 || status >= 300) return fail('unreachable');
          const type = (res.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
          if (!type.startsWith('image/') || type.startsWith('image/svg')) return fail('not_image');
          const declared = Number(res.headers['content-length']);
          if (Number.isFinite(declared) && declared > maxBytes) return fail('too_large');
          const chunks: Buffer[] = [];
          let size = 0;
          let mime: string | null = null;
          res.on('data', (c: Buffer) => {
            size += c.length;
            if (size > maxBytes) return fail('too_large');
            chunks.push(c);
            if (!mime && size >= SNIFF_BYTES) {
              mime = sniffImage(Buffer.concat(chunks));
              if (!mime) fail('not_image');
            }
          });
          res.on('end', () => {
            const bytes = Buffer.concat(chunks);
            mime ??= sniffImage(bytes);
            if (!mime) return reject(new FetchImageFailure('not_image'));
            resolve({ kind: 'image', image: { mime, bytes } });
          });
          res.on('error', () => reject(new FetchImageFailure(signal.aborted ? 'timeout' : 'unreachable')));
        },
      );
      req.on('error', () => reject(new FetchImageFailure(signal.aborted ? 'timeout' : 'unreachable')));
      req.end();
    });
  }
}
