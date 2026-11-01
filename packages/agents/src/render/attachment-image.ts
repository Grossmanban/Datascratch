/**
 * Pictures of a note (photos, screenshots) for agents (agents-api.md §6): the decrypted
 * attachment, scaled down to fit and re-encoded. PNG sources stay PNG (screenshots keep sharp
 * text and transparency), everything else becomes JPEG, which is far smaller for photos.
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";

export interface AgentImage {
  data: Buffer;
  mimeType: "image/png" | "image/jpeg";
  width: number;
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

/** Returns null when the bytes are not an image the renderer can decode (e.g. HEIC). */
export async function scaleImage(bytes: Uint8Array, maxSide: number): Promise<AgentImage | null> {
  let img: Awaited<ReturnType<typeof loadImage>>;
  try {
    img = await loadImage(Buffer.from(bytes));
  } catch {
    return null;
  }
  if (!img.width || !img.height) return null;
  const k = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * k));
  const height = Math.max(1, Math.round(img.height * k));
  const canvas = createCanvas(width, height);
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
  const png = PNG_SIGNATURE.every((b, i) => bytes[i] === b);
  const data = png ? await canvas.encode("png") : await canvas.encode("jpeg", 85);
  return { data, mimeType: png ? "image/png" : "image/jpeg", width, height };
}
