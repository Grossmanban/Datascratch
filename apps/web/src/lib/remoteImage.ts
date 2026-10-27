// Fetches an image linked from pasted HTML so the editor can store it as an attachment.
// Any failure (CORS, CSP, a timeout, a non-image or a file over the cap) rejects, and the
// editor keeps the image as a link.

export const REMOTE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const REMOTE_IMAGE_TIMEOUT_MS = 15_000;

export async function fetchRemoteImage(url: string, timeoutMs = REMOTE_IMAGE_TIMEOUT_MS): Promise<File> {
  const u = new URL(url);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("not an http(s) url");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(u, { credentials: "omit", referrerPolicy: "no-referrer", signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const mime = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    if (!mime.startsWith("image/")) throw new Error("not an image");
    if (Number(res.headers.get("content-length") ?? 0) > REMOTE_IMAGE_MAX_BYTES) throw new Error("too large");
    // Read in chunks so a server that lies about (or omits) its length cannot exceed the cap.
    const reader = res.body?.getReader();
    if (!reader) throw new Error("no body");
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > REMOTE_IMAGE_MAX_BYTES) {
        void reader.cancel();
        throw new Error("too large");
      }
      parts.push(value);
    }
    const name = decodeURIComponent(u.pathname.split("/").pop() || "") || "image";
    return new File(parts as BlobPart[], name, { type: mime });
  } finally {
    clearTimeout(timer);
  }
}
