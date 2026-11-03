// Decrypted attachments become blob: URLs on our own origin. A document type (HTML, SVG, XML…)
// opened from such a URL would run its scripts with access to the keys, and the type comes from
// the attachment metadata, which is not authenticated (audit 2026-10-27). So a blob gets only an
// allowlisted type, and only those are opened in a tab; anything else is downloaded.

const TEXT = new Set(["text/plain", "text/markdown", "text/csv"]);
const RASTER = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/bmp"]);

/** The type a decrypted blob may carry: a raster image, PDF, text as plain text, else opaque bytes. */
export function safeBlobType(mime: string | undefined | null): string {
  const m = (mime ?? "").split(";")[0]!.trim().toLowerCase();
  if (RASTER.has(m) || m === "application/pdf") return m;
  // Plain text formats are shown as plain text; markup and code (HTML, XML, JS, CSS…) are downloaded.
  if (TEXT.has(m)) return "text/plain;charset=utf-8";
  return "application/octet-stream";
}

/** Whether an attachment of this type may be opened in a browser tab (otherwise it is downloaded). */
export function opensInline(mime: string | undefined | null): boolean {
  return safeBlobType(mime) !== "application/octet-stream";
}

export const isSvg = (file: { type: string; name: string }) => file.type.toLowerCase() === "image/svg+xml" || /\.svgz?$/i.test(file.name);
