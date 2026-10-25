import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Fixed position next to a viewport rect (e.g. a text selection from the
 * editor). Prefers `placement`, flips when there is no room, clamps to the
 * viewport with an 8px margin. Does not take focus — the editor keeps it.
 */
export function useAnchoredPosition(
  anchor: AnchorRect | null | undefined,
  placement: "above" | "below",
  gap = 8,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ position: "fixed", top: -9999, left: -9999 });
  const [side, setSide] = useState<"top" | "bottom">(placement === "above" ? "top" : "bottom");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!anchor || !el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const roomAbove = anchor.top - gap - h >= 8;
    const roomBelow = anchor.top + anchor.height + gap + h <= vh - 8;
    const above = placement === "above" ? roomAbove || !roomBelow : !(roomBelow || !roomAbove);
    const top = above ? anchor.top - gap - h : anchor.top + anchor.height + gap;
    const center = placement === "above" ? anchor.left + anchor.width / 2 - w / 2 : anchor.left;
    const left = Math.min(Math.max(8, center), vw - w - 8);
    setSide(above ? "top" : "bottom");
    setStyle({ position: "fixed", top: Math.max(8, top), left });
  }, [anchor?.top, anchor?.left, anchor?.width, anchor?.height, placement, gap]);
  return { ref, style, side };
}
