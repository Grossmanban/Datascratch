// Pictures in a note are stored the size iOS stores them (spec/04 «Фото и файлы»): the longer side
// at most 2560 px. A Retina screenshot is 2–6 MB as a PNG; uploading the original made a paste of a
// few screenshots take minutes. The original is not kept.
//   PNG  → PNG (screenshots keep sharp text), unless it is still over 1.5 MB after the downscale and
//          has no transparency: then JPEG q 0.9.
//   JPEG, WebP → JPEG q 0.9 (a transparent WebP stays a PNG).
//   Anything else (GIF animations, SVG — drawn into a PNG by svgToPng) is left as it is.

export const NOTE_IMAGE_MAX_SIDE = 2560;
export const NOTE_PNG_MAX_BYTES = 1.5 * 1024 * 1024;
export const NOTE_JPEG_QUALITY = 0.9;

const RESIZABLE = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

/** Target size for a picture: the longer side at most `maxSide`, aspect kept, whole pixels. */
export function fitWithin(width: number, height: number, maxSide = NOTE_IMAGE_MAX_SIDE): { width: number; height: number; scaled: boolean } {
  const longer = Math.max(width, height);
  if (longer <= maxSide) return { width, height, scaled: false };
  const scale = maxSide / longer;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scaled: true };
}

function renamed(name: string, mime: string): string {
  const ext = mime === "image/jpeg" ? "jpg" : "png";
  const base = name.replace(/\.[a-z0-9]+$/i, "") || "image";
  return `${base}.${ext}`;
}

type Canvas2D = { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D };

function makeCanvas(width: number, height: number): Canvas2D {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, ctx: canvas.getContext("2d")! };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d")! };
}

async function toBlob(c: Canvas2D, type: string, quality?: number): Promise<Blob> {
  if ("convertToBlob" in c.canvas) return c.canvas.convertToBlob({ type, quality });
  const el = c.canvas;
  return new Promise((ok, fail) => el.toBlob((b) => (b ? ok(b) : fail(new Error("image could not be encoded"))), type, quality));
}

/**
 * Draws the picture at the target size. A big reduction goes in halving steps, which keeps thin
 * lines and small text of screenshots crisp (one high-quality step still aliases at 1/3 and below).
 */
function draw(bitmap: ImageBitmap, width: number, height: number): Canvas2D {
  let src: CanvasImageSource = bitmap;
  let w = bitmap.width;
  let h = bitmap.height;
  while (w / 2 > width && h / 2 > height) {
    const step = makeCanvas(Math.round(w / 2), Math.round(h / 2));
    step.ctx.imageSmoothingQuality = "high";
    step.ctx.drawImage(src, 0, 0, step.canvas.width, step.canvas.height);
    src = step.canvas;
    w = step.canvas.width;
    h = step.canvas.height;
  }
  const out = makeCanvas(width, height);
  out.ctx.imageSmoothingQuality = "high";
  out.ctx.drawImage(src, 0, 0, width, height);
  return out;
}

function hasTransparency(c: Canvas2D): boolean {
  const { data } = c.ctx.getImageData(0, 0, c.canvas.width, c.canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) return true;
  return false;
}

/** The picture as it is stored in a note (see the rules above). Never throws for a picture it cannot decode: it is kept as is. */
export async function prepareNoteImage(file: File): Promise<File> {
  const mime = file.type.toLowerCase();
  if (!RESIZABLE.has(mime)) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    const target = fitWithin(bitmap.width, bitmap.height);
    if (mime === "image/png" && !target.scaled && file.size <= NOTE_PNG_MAX_BYTES) return file;
    const canvas = draw(bitmap, target.width, target.height);
    let out: Blob;
    if (mime === "image/png") {
      out = await toBlob(canvas, "image/png");
      if (out.size > NOTE_PNG_MAX_BYTES && !hasTransparency(canvas)) out = await toBlob(canvas, "image/jpeg", NOTE_JPEG_QUALITY);
    } else if (mime === "image/webp" && hasTransparency(canvas)) {
      out = await toBlob(canvas, "image/png");
    } else {
      out = await toBlob(canvas, "image/jpeg", NOTE_JPEG_QUALITY);
    }
    return new File([out], renamed(file.name, out.type), { type: out.type, lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
