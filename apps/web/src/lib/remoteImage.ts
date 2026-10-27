// Fetches an image linked from pasted HTML so the editor can store it as an attachment.
// D-52: through our server (`POST /fetch-image`, api.md «Картинка по ссылке»), so the web CSP
// stays `connect-src 'self'` and the server applies its guards (no private networks, ≤ 3
// redirects, images without SVG, ≤ 20 MB, 15 s). Any failure rejects, and the editor keeps
// the image as a link.

import { requestResponse } from "@/api/client";

export const REMOTE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
// The server gives up after 15 s; allow for the trip and the transfer on top.
export const REMOTE_IMAGE_TIMEOUT_MS = 30_000;

export class RemoteImageError extends Error {
  constructor(readonly code: string) {
    super(`fetch-image: ${code}`);
    this.name = "RemoteImageError";
  }
}

export async function fetchRemoteImage(url: string): Promise<File> {
  const u = new URL(url);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new RemoteImageError("blocked");
  const res = await requestResponse("POST", "/fetch-image", { body: { url: u.href }, timeoutMs: REMOTE_IMAGE_TIMEOUT_MS });
  if (res.status !== 200) {
    // 422 { error: "blocked" | "not_image" | "too_large" | "timeout" | "unreachable" }, 429, …
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
    throw new RemoteImageError(typeof body?.error === "string" ? body.error : `http_${res.status}`);
  }
  const mime = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (!mime.startsWith("image/") || mime === "image/svg+xml") throw new RemoteImageError("not_image");
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > REMOTE_IMAGE_MAX_BYTES) throw new RemoteImageError("too_large");
  const name = decodeURIComponent(u.pathname.split("/").pop() || "") || "image";
  return new File([bytes], name, { type: mime });
}
