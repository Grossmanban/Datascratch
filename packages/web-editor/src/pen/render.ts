import { outlineShapes, type RenderPoint } from "./geometry";

/** Fills a variable-width stroke in one pass (uniform alpha, no darkened joints). */
export function fillSegments(ctx: CanvasRenderingContext2D, segments: readonly RenderPoint[][], color: string, opacity: number): void {
  const path = new Path2D();
  for (const seg of segments) {
    const { quads, discs } = outlineShapes(seg);
    for (const q of quads) {
      path.moveTo(q[0]![0], q[0]![1]);
      for (let i = 1; i < q.length; i++) path.lineTo(q[i]![0], q[i]![1]);
      path.closePath();
    }
    for (const [x, y, r] of discs) {
      path.moveTo(x + r, y);
      path.arc(x, y, Math.max(0.25, r), 0, Math.PI * 2, false);
      path.closePath();
    }
  }
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.fill(path, "nonzero");
  ctx.globalAlpha = 1;
}

/** Sizes a canvas for the device pixel ratio and maps layer coordinates onto it. */
export function prepareCanvas(canvas: HTMLCanvasElement, rect: { left: number; top: number; width: number; height: number }, dpr: number): CanvasRenderingContext2D | null {
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  canvas.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.setTransform(dpr, 0, 0, dpr, -rect.left * dpr, -rect.top * dpr);
  return ctx;
}
