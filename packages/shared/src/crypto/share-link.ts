// Share links (crypto.md §7): https://<web-host>/s/<shareId>#k=<base64url key>.
// The fragment never reaches the server.
import { KEY_BYTES, SHARE_LINK_KEY_PARAM } from "../contracts/crypto.js";
import { fromBase64Url, toBase64Url } from "./base64url.js";
import { CryptoError } from "./errors.js";

export function buildShareLink(webOrigin: string, shareId: string, key: Uint8Array): string {
  if (key.length !== KEY_BYTES) throw new CryptoError("invalid_key", "share key must be 32 bytes");
  const origin = webOrigin.replace(/\/+$/, "");
  return `${origin}/s/${shareId}#${SHARE_LINK_KEY_PARAM}=${toBase64Url(key)}`;
}

export interface ParsedShareLink {
  shareId: string;
  key: Uint8Array;
}

export function parseShareLink(url: string): ParsedShareLink {
  const u = new URL(url);
  const m = /^\/s\/([^/]+)\/?$/.exec(u.pathname);
  if (!m) throw new CryptoError("malformed", "not a share link");
  const params = new URLSearchParams(u.hash.replace(/^#/, ""));
  const k = params.get(SHARE_LINK_KEY_PARAM);
  if (!k) throw new CryptoError("malformed", "share link has no key");
  let key: Uint8Array;
  try {
    key = fromBase64Url(k);
  } catch {
    throw new CryptoError("malformed", "share link key is not base64url");
  }
  if (key.length !== KEY_BYTES) throw new CryptoError("invalid_key", "share key must be 32 bytes");
  return { shareId: decodeURIComponent(m[1]!), key };
}
