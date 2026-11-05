import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fitWithin, NOTE_PNG_MAX_BYTES, prepareNoteImage } from "./imagePrep";

// jsdom has no image decoding or canvas: createImageBitmap and OffscreenCanvas are stood in by
// fakes that report the source size, record what was drawn and encode to blobs of chosen sizes.
// The real browser path is covered by e2e/specs/images.spec.ts.

let source = { width: 0, height: 0 };
let encoded: Record<string, number> = {};
let transparent = false;
const drawn: { width: number; height: number }[] = [];

class FakeCanvas {
  constructor(
    public width: number,
    public height: number,
  ) {}
  getContext() {
    const canvas = this;
    return {
      imageSmoothingQuality: "low",
      drawImage: () => drawn.push({ width: canvas.width, height: canvas.height }),
      getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, transparent ? 128 : 255]) }),
    };
  }
  async convertToBlob({ type }: { type: string }) {
    return new Blob([new Uint8Array(encoded[type] ?? 10)], { type });
  }
}

beforeEach(() => {
  drawn.length = 0;
  transparent = false;
  encoded = { "image/png": 500_000, "image/jpeg": 300_000 };
  vi.stubGlobal("OffscreenCanvas", FakeCanvas);
  vi.stubGlobal("createImageBitmap", async () => ({ ...source, close: () => undefined }));
});
afterEach(() => vi.unstubAllGlobals());

const file = (type: string, size = 1000, name = "shot.png") => new File([new Uint8Array(size)], name, { type });

describe("fitWithin", () => {
  it("keeps the longer side at most 2560 px with the aspect ratio", () => {
    expect(fitWithin(5120, 2880)).toEqual({ width: 2560, height: 1440, scaled: true });
    expect(fitWithin(1800, 4000)).toEqual({ width: 1152, height: 2560, scaled: true });
    expect(fitWithin(2560, 1600)).toEqual({ width: 2560, height: 1600, scaled: false });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600, scaled: false });
  });
});

describe("prepareNoteImage", () => {
  it("a Retina PNG screenshot is downscaled to 2560 px and stays a PNG", async () => {
    source = { width: 5120, height: 2880 };
    const out = await prepareNoteImage(file("image/png", 4_000_000));
    expect(out.type).toBe("image/png");
    expect(out.name).toBe("shot.png");
    expect(out.size).toBe(500_000);
    expect(drawn.at(-1)).toEqual({ width: 2560, height: 1440 });
  });

  it("a PNG still over 1.5 MB after the downscale becomes JPEG q 0.9, unless it is transparent", async () => {
    source = { width: 5120, height: 2880 };
    encoded["image/png"] = NOTE_PNG_MAX_BYTES + 1;
    const photo = await prepareNoteImage(file("image/png", 9_000_000, "photo.png"));
    expect(photo.type).toBe("image/jpeg");
    expect(photo.name).toBe("photo.jpg");
    transparent = true;
    const window = await prepareNoteImage(file("image/png", 9_000_000, "window.png"));
    expect(window.type).toBe("image/png");
  });

  it("a small PNG is kept byte for byte (no re-encoding)", async () => {
    source = { width: 1200, height: 800 };
    const input = file("image/png", 200_000);
    expect(await prepareNoteImage(input)).toBe(input);
    expect(drawn).toEqual([]);
  });

  it("an un-scaled PNG over 1.5 MB is re-encoded by the same rule", async () => {
    source = { width: 2000, height: 1500 };
    encoded["image/png"] = NOTE_PNG_MAX_BYTES + 1;
    const out = await prepareNoteImage(file("image/png", 3_000_000));
    expect(out.type).toBe("image/jpeg");
    expect(drawn.at(-1)).toEqual({ width: 2000, height: 1500 });
  });

  it("JPEG and WebP become JPEG at most 2560 px; a transparent WebP stays a PNG", async () => {
    source = { width: 4032, height: 3024 };
    const jpeg = await prepareNoteImage(file("image/jpeg", 3_000_000, "IMG_1.HEIC.jpeg"));
    expect(jpeg.type).toBe("image/jpeg");
    expect(drawn.at(-1)).toEqual({ width: 2560, height: 1920 });
    const webp = await prepareNoteImage(file("image/webp", 1_000_000, "a.webp"));
    expect(webp.type).toBe("image/jpeg");
    expect(webp.name).toBe("a.jpg");
    transparent = true;
    expect((await prepareNoteImage(file("image/webp", 1_000_000, "b.webp"))).type).toBe("image/png");
  });

  it("a big reduction is drawn in halving steps, ending at the target size", async () => {
    source = { width: 12000, height: 6000 };
    await prepareNoteImage(file("image/jpeg", 8_000_000));
    expect(drawn.map((d) => d.width)).toEqual([6000, 3000, 2560]);
  });

  it("GIF and other files, and pictures that cannot be decoded, are left as they are", async () => {
    const gif = file("image/gif", 5_000_000, "anim.gif");
    expect(await prepareNoteImage(gif)).toBe(gif);
    const pdf = file("application/pdf", 5_000_000, "a.pdf");
    expect(await prepareNoteImage(pdf)).toBe(pdf);
    vi.stubGlobal("createImageBitmap", async () => {
      throw new Error("decode");
    });
    const broken = file("image/png", 5_000_000);
    expect(await prepareNoteImage(broken)).toBe(broken);
  });
});
